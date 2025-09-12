// src/modules/merchant(loja)/services/erpSalesService.ts
import axios from 'axios';
import { MerchantErpMapping } from '@db/models/MerchantErpMapping';
import { ErpLocation } from '@db/models';
import { ErpCustomerService } from './erpCustomerService';
import { ErpSaleLink } from '@db/models/erpSaleLink';

export type ErpOpResult = {
  ok: boolean;
  status?: number; // opcional em todos os retornos
  data?: any;
  skipped?: boolean;
  reason?: 'no-base-url' | 'no-link' | 'no-mapping';
  alreadyExists?: boolean;
};

const BASE = (process.env.BASE_URL_ERP || '').replace(/\/+$/, '');
const TOKEN = process.env.ERP_API_TOKEN || '';
const HDR = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

const SITUACAO = {
  CONFIRMADO: Number(process.env.ERP_SITUACAO_ID_CONFIRMADO || 3150), // ajuste o default conforme ERP
  CANCELADO: Number(process.env.ERP_SITUACAO_ID_CANCELADO || 9998),
  CONCLUIDO: Number(process.env.ERP_SITUACAO_ID_CONCLUIDO || 9999),
};

const SALE_TIPO = process.env.ERP_SALE_TIPO || 'produto';

function todayISODate() {
  // YYYY-MM-DD
  return new Date().toISOString().slice(0, 10);
}

export class ErpSalesService {
  static async createSaleFromIfoodOrder(params: { merchantId: string; order: any }): Promise<ErpOpResult> {
    const { merchantId, order } = params;
    if (!BASE) return { ok: false, skipped: true, reason: 'no-base-url' };

    // idempotency key local
    const idempotencyKey = `IFOOD:${merchantId}:${order?.id || order?.orderId}`;

    // já existe vínculo? (evita recriar no retry)
    const existing = await ErpSaleLink.findOne({
      where: { merchant_id: merchantId, order_id: String(order?.id || order?.orderId) },
    });
    if (existing?.erp_sale_id) {
      console.log(
        `🔗 [ERP] venda já vinculada (merchant=${merchantId}, order=${order?.id || order?.orderId}, erp_sale_id=${existing.erp_sale_id})`
      );
      return { ok: true, alreadyExists: true, data: existing };
    }

    // loja ERP pelo merchant
    const mapping = await MerchantErpMapping.findOne({ where: { merchant_id: merchantId } });
    if (!mapping) return { ok: false, skipped: true, reason: 'no-mapping' };

    const erpLoc = await ErpLocation.findOne({ where: { id: mapping.erp_location_id } });
    const erpStore = {
      id: String(mapping.erp_location_id),
      code: String(erpLoc?.code ?? mapping.erp_location_id),
      name: erpLoc?.name ?? String(mapping.erp_location_id),
    };

    // cliente
    const customer = await ErpCustomerService.ensureCustomerForOrder({ merchantId, order });

    // payload
    const payload = buildErpSalePayload(order, {
      merchantId,
      erpStore,
      idempotencyKey,
      channel: 'IFOOD',
      clienteId: customer.clienteId,
    });

    const url = `${BASE}/vendas`;
    const resp = await axios.post(url, payload, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...HDR, 'Idempotency-Key': idempotencyKey },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (resp.status >= 200 && resp.status < 300) {
      const saleId = String(resp.data?.id ?? resp.data?.codigo ?? '');
      const saleCodigo = String(resp.data?.codigo ?? resp.data?.id ?? '');
      await ErpSaleLink.upsert({
        merchant_id: merchantId,
        order_id: String(order?.id || order?.orderId),
        idempotency_key: idempotencyKey,
        erp_sale_id: saleId || saleCodigo,
        erp_sale_codigo: saleCodigo || saleId,
        cliente_id: customer.clienteId ?? null,
        loja_id: erpStore.id,
        status: 'CREATED',
      });
      console.log(`✅ [ERP][POST] venda criada (merchant=${merchantId}, order=${order?.id || order?.orderId}, erp_sale_id=${saleId || saleCodigo})`);
      return { ok: true, status: resp.status, data: resp.data };
    }

    if (resp.status === 409) {
      // tente obter o link salvo (retry)
      const link = await ErpSaleLink.findOne({ where: { idempotency_key: idempotencyKey } });
      console.log(`ℹ️ [ERP][POST] idempotente (409). usando link local=${Boolean(link)} order=${order?.id || order?.orderId}`);
      return { ok: true, status: 409, alreadyExists: true, data: link ?? null };
    }

    console.warn('⚠️ [ERP][POST] falha ao criar venda:', resp.status, resp.data);
    return { ok: false, status: resp.status, data: resp.data };
  }

  /** CAN → cancelar/estornar no ERP via PUT /vendas/{id} */
  static async cancelSaleByKey(params: { merchantId: string; orderId: string; data?: string }): Promise<ErpOpResult> {
    const { merchantId, orderId } = params;
    const link = await ErpSaleLink.findOne({ where: { merchant_id: merchantId, order_id: String(orderId) } });
    if (!link?.erp_sale_id && !link?.erp_sale_codigo) {
      console.warn(`⚠️ Sem ErpSaleLink para cancelar (merchant=${merchantId}, order=${orderId}).`);
      return { ok: false, skipped: true, reason: 'no-link' };
    }
    console.log(
      `🔗 [ERP][CAN] usando venda id=${link.erp_sale_id || link.erp_sale_codigo} (codigo=${link.erp_sale_codigo || '-'}, cliente_id=${link.cliente_id || '-'})`
    );
    const id = String(link.erp_sale_id || link.erp_sale_codigo);
    return this.updateSaleRequiredFields({
      id,
      tipo: SALE_TIPO,
      codigo: Number(link.erp_sale_codigo || link.erp_sale_id || 0),
      cliente_id: Number(link.cliente_id || 0),
      situacao_id: SITUACAO.CANCELADO,
      data: params.data || todayISODate(),
      extra: { nome_situacao: 'Cancelado' },
      statusSave: 'CANCELLED',
      link,
    });
  }

  /** CON → finalizar/faturar no ERP via PUT /vendas/{id} */
  static async finalizeSaleByKey(params: { merchantId: string; orderId: string; data?: string }): Promise<ErpOpResult> {
    const { merchantId, orderId } = params;
    const link = await ErpSaleLink.findOne({ where: { merchant_id: merchantId, order_id: String(orderId) } });
    if (!link?.erp_sale_id && !link?.erp_sale_codigo) {
      console.warn(`⚠️ Sem ErpSaleLink para finalizar (merchant=${merchantId}, order=${orderId}).`);
      return { ok: false, skipped: true, reason: 'no-link' };
    }
    console.log(
      `🔗 [ERP][CON] usando venda id=${link.erp_sale_id || link.erp_sale_codigo} (codigo=${link.erp_sale_codigo || '-'}, cliente_id=${link.cliente_id || '-'})`
    );
    const id = String(link.erp_sale_id || link.erp_sale_codigo);
    return this.updateSaleRequiredFields({
      id,
      tipo: SALE_TIPO,
      codigo: Number(link.erp_sale_codigo || link.erp_sale_id || 0),
      cliente_id: Number(link.cliente_id || 0),
      situacao_id: SITUACAO.CONCLUIDO,
      data: params.data || todayISODate(),
      extra: { nome_situacao: 'Concluído' },
      statusSave: 'FINALIZED',
      link,
    });
  }

  /** PUT /vendas/{id} com os campos obrigatórios + extras opcionais */
  private static async updateSaleRequiredFields(params: {
    id: string;
    tipo: string;                 // 'produto' | 'servico'
    codigo: number;               // requerido pelo ERP
    cliente_id: number;           // requerido
    situacao_id: number;          // requerido
    data: string;                 // 'YYYY-MM-DD'
    extra?: Record<string, any>;  // ex.: vendedor_id, pagamentos, produtos, etc.
    statusSave: string;           // status para salvar no link
    link: ErpSaleLink;
  }): Promise<ErpOpResult> {
    if (!BASE) return { ok: false, skipped: true, reason: 'no-base-url' };

    const url = `${BASE}/vendas/${encodeURIComponent(params.id)}`;
    const body = {
      tipo: params.tipo || 'produto',
      codigo: params.codigo,
      cliente_id: params.cliente_id,
      situacao_id: params.situacao_id,
      data: params.data,
      ...(params.extra || {}),
    };

    console.log(
      `➡️ [ERP][PUT] ${url} ` +
      `(codigo=${body.codigo}, cliente_id=${body.cliente_id}, situacao_id=${body.situacao_id}, data=${body.data})`
    );

    const resp = await axios.put(url, body, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...HDR },
      timeout: 15000,
      validateStatus: () => true,
    });

    console.log(
      `⬅️ [ERP][PUT] status=${resp.status} ` +
      `id=${params.id} situacao_id=${body.situacao_id} resultado=${resp.status >= 200 && resp.status < 300 ? 'OK' : 'FAIL'}`
    );

    if (resp.status >= 200 && resp.status < 300) {
      await params.link.update({ status: params.statusSave });
      return { ok: true, status: resp.status, data: resp.data };
    }
    return { ok: false, status: resp.status, data: resp.data };
  }
}

/** (mesmo builder de antes; mantido aqui para contexto) */
function buildErpSalePayload(order: any, ctx: {
  merchantId: string;
  erpStore: { id: string; code: string; name?: string };
  idempotencyKey: string;
  channel: string;
  clienteId?: string;
}) {
  const o = order || {};
  const cust = o?.customer || {};
  const addr = (o?.delivery?.deliveryAddress || o?.deliveryAddress || {}) as any;

  const payments = Array.isArray(o?.payments) ? o.payments : (Array.isArray(o?.charges) ? o.charges : []);
  const items = Array.isArray(o?.items) ? o.items : [];

  const monetary = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

  const totals = {
    subtotal: monetary(o?.total?.subTotal || o?.price?.subTotal),
    discounts: monetary(o?.total?.discount || o?.price?.discount),
    deliveryFee: monetary(o?.total?.deliveryFee || o?.price?.deliveryFee),
    otherFees: monetary(o?.total?.benefits || 0),
    total: monetary(o?.total?.orderAmount || o?.price?.total || o?.total || 0),
  };

  const base: any = {
    idempotencyKey: ctx.idempotencyKey,
    channel: ctx.channel,
    loja_id: ctx.erpStore.id,
    ...(ctx.clienteId ? { cliente_id: Number(ctx.clienteId) } : {}),

    // informativo
    store: { id: ctx.erpStore.id, code: ctx.erpStore.code, name: ctx.erpStore.name },

    order: {
      id: o?.id || o?.orderId,
      displayId: o?.displayId || o?.reference || null,
      createdAt: o?.createdAt || o?.created || o?.createdDate || null,
      confirmedAt: o?.confirmation?.time || o?.confirmedAt || null,
      status: 'CONFIRMED',
    },

    customer: {
      id: cust?.id || null,
      name: cust?.name || [cust?.firstName, cust?.lastName].filter(Boolean).join(' ') || null,
      cpfCnpj: cust?.taxPayerId || cust?.documentNumber || null,
      phone: cust?.phone?.number || cust?.phones?.[0]?.number || null,
      email: cust?.email || null,
    },

    delivery: {
      mode: o?.orderType || o?.delivery?.mode || 'DELIVERY',
      pickupCode: o?.takeout?.takeoutCode || null,
      address: addr
        ? {
            street: addr?.streetName || addr?.street || null,
            number: addr?.streetNumber || addr?.number || null,
            complement: addr?.complement || null,
            reference: addr?.reference || null,
            district: addr?.neighborhood || null,
            city: addr?.city || addr?.municipality || null,
            state: addr?.state || null,
            country: addr?.country || 'BR',
            zipcode: addr?.postalCode || addr?.zipCode || null,
            latitude: addr?.coordinates?.latitude || null,
            longitude: addr?.coordinates?.longitude || null,
          }
        : null,
    },

    payments: payments.map((p: any) => ({
      method: p?.method || p?.type || p?.paymentType || 'UNKNOWN',
      value: monetary(p?.value || p?.paid || p?.amount),
      prepaid: Boolean(p?.prepaid ?? true),
      provider: p?.provider || p?.issuer || null,
      tid: p?.transactionId || p?.authorizationCode || null,
    })),

    totals,

    items: items.map((it: any) => ({
      uniqueId: it?.uniqueId || it?.id || null,
      sku: it?.externalCode || it?.ean || it?.sku || null,
      name: it?.name || it?.description || null,
      qty: Number(it?.quantity || it?.qty || 0),
      unitPrice: monetary(it?.unitPrice || it?.price?.unit || it?.price),
      totalPrice: monetary(it?.totalPrice || (Number(it?.quantity || 0) * Number(it?.unitPrice || 0))),
      notes: it?.observations || it?.notes || null,
    })),
  };

  return base;
}

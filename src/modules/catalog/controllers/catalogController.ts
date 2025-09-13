import { Request, Response } from 'express';
import { IfoodCatalogService } from '../services/ifoodCatalogService';

export async function listCatalogsController(req: Request, res: Response) {
  try {
    const { merchantId } = req.query as any;
    if (!merchantId) return res.status(400).json({ message: 'merchantId é obrigatório' });
    const data = await IfoodCatalogService.listCatalogs(merchantId);
    res.json(data);
  } catch (e: any) {
    console.error('listCatalogsController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao listar catálogos' });
  }
}

export async function listCategoriesController(req: Request, res: Response) {
  try {
    const { merchantId, includeItems } = req.query as any;
    const { catalogId } = req.params;
    if (!merchantId) return res.status(400).json({ message: 'merchantId é obrigatório' });
    const data = await IfoodCatalogService.listCategories(merchantId, catalogId, includeItems === 'true');
    res.json(data);
  } catch (e: any) {
    console.error('listCategoriesController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao listar categorias' });
  }
}

export async function createCategoryController(req: Request, res: Response) {
  try {
    const { merchantId } = req.query as any;
    const { catalogId } = req.params;
    if (!merchantId) return res.status(400).json({ message: 'merchantId é obrigatório' });
    const payload = req.body;
    const data = await IfoodCatalogService.createCategory(merchantId, catalogId, payload);
    res.json({ ok: true, result: data });
  } catch (e: any) {
    console.error('createCategoryController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao criar categoria' });
  }
}

export async function putItemController(req: Request, res: Response) {
  try {
    const { merchantId } = req.query as any;
    if (!merchantId) return res.status(400).json({ message: 'merchantId é obrigatório' });
    const data = await IfoodCatalogService.putItem(merchantId, req.body);
    res.json({ ok: true, result: data });
  } catch (e: any) {
    console.error('putItemController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao criar/editar item' });
  }
}

export async function patchItemsPriceController(req: Request, res: Response) {
  try {
    const { merchantId, items } = req.body ?? {};
    if (!merchantId || !Array.isArray(items)) {
      return res.status(400).json({ message: 'merchantId e items[] são obrigatórios' });
    }
    const data = await IfoodCatalogService.patchItemsPrice({ merchantId, items });
    res.json({ ok: true, result: data });
  } catch (e: any) {
    console.error('patchItemsPriceController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao alterar preço dos itens' });
  }
}

export async function patchItemsStatusController(req: Request, res: Response) {
  try {
    const { merchantId, items } = req.body ?? {};
    if (!merchantId || !Array.isArray(items)) {
      return res.status(400).json({ message: 'merchantId e items[] são obrigatórios' });
    }
    const data = await IfoodCatalogService.patchItemsStatus({ merchantId, items });
    res.json({ ok: true, result: data });
  } catch (e: any) {
    console.error('patchItemsStatusController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao alterar status dos itens' });
  }
}

export async function patchOptionsPriceController(req: Request, res: Response) {
  try {
    const { merchantId, options } = req.body ?? {};
    if (!merchantId || !Array.isArray(options)) {
      return res.status(400).json({ message: 'merchantId e options[] são obrigatórios' });
    }
    const data = await IfoodCatalogService.patchOptionsPrice({ merchantId, options });
    res.json({ ok: true, result: data });
  } catch (e: any) {
    console.error('patchOptionsPriceController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao alterar preço dos complementos' });
  }
}

export async function patchOptionsStatusController(req: Request, res: Response) {
  try {
    const { merchantId, options } = req.body ?? {};
    if (!merchantId || !Array.isArray(options)) {
      return res.status(400).json({ message: 'merchantId e options[] são obrigatórios' });
    }
    const data = await IfoodCatalogService.patchOptionsStatus({ merchantId, options });
    res.json({ ok: true, result: data });
  } catch (e: any) {
    console.error('patchOptionsStatusController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao alterar status dos complementos' });
  }
}

export async function uploadImageController(req: Request, res: Response) {
  try {
    // Suporta multer (req.file) OU base64 (req.body.imageBase64)
    const { merchantId, filename, contentType, imageBase64 } = req.body ?? {};
    if (!merchantId) return res.status(400).json({ message: 'merchantId é obrigatório' });

    // @ts-ignore
    const fileBuffer: Buffer | undefined = (req as any).file?.buffer;

    const data = await IfoodCatalogService.uploadImage(merchantId, {
      fileBuffer,
      filename,
      contentType,
      imageBase64,
    });

    res.json({ ok: true, result: data });
  } catch (e: any) {
    console.error('uploadImageController', e?.response?.data ?? e);
    res.status(500).json({ message: 'Falha ao fazer upload de imagem' });
  }
}

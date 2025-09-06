// // src/jobs/orderRetryJob.ts
// import { Job } from 'bullmq';
// import axios from 'axios';
// import { IfoodAuthService } from '../modules/authentication/services/ifoodAuthService';

// const MAX_ATTEMPTS = 10;
// const DELAY_BASE_MS = 5000; // Exponential backoff base: 5s

// export async function handleOrderRetryJob(job: Job) {
//   const { orderId, merchantId, attempts = 0 } = job.data;

//   try {
//     const { access_token } = await IfoodAuthService.getAccessToken();

//     const response = await axios.get(
//       `https://merchant-api.ifood.com.br/orders/v1.0/orders/${orderId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${access_token}`,
//           Accept: 'application/json',
//         },
//       }
//     );

//     const orderDetails = response.data;

//     console.log(`✅ Pedido ${orderId} encontrado e processado.`);
//     // TODO: Chamar um service para processar o pedido detalhado
//     // await OrderService.process(orderDetails);

//   } catch (error: any) {
//     if (error.response?.status === 404) {
//       if (attempts < MAX_ATTEMPTS) {
//         const delay = DELAY_BASE_MS * Math.pow(2, attempts); // exponential
//         console.log(`⏳ Pedido ${orderId} ainda indisponível. Retentando em ${delay / 1000}s`);

//         await job.queue.add('fetchOrderDetails', {
//           orderId,
//           merchantId,
//           attempts: attempts + 1,
//         }, {
//           delay,
//         });
//       } else {
//         console.error(`❌ Pedido ${orderId} não encontrado após ${MAX_ATTEMPTS} tentativas.`);
//         // TODO: logar falha persistente, notificar, etc.
//       }
//     } else {
//       console.error(`❌ Erro ao buscar detalhes do pedido ${orderId}:`, error.message);
//     }
//   }
// }

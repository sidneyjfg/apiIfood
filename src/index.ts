import app from './app';
import { sequelize } from './config/database';

const PORT = process.env.PORT || 3000;

sequelize.authenticate().then(() => {
  console.log('Conectado ao MySQL com sucesso.');
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}).catch(err => {
  console.error('Erro ao conectar no MySQL:', err);
});

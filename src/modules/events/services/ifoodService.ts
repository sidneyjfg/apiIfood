import axios from 'axios';

export async function authenticateIfood(): Promise<string> {
  const { IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET } = process.env;

  const response = await axios.post('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', {
    grant_type: 'client_credentials',
    client_id: IFOOD_CLIENT_ID,
    client_secret: IFOOD_CLIENT_SECRET,
  });

  return response.data.access_token;
}

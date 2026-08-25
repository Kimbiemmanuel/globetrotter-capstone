import axios from 'axios';

export async function getDestinations() {
  const res = await axios.get('/api/destinations');
  return res.data;
}

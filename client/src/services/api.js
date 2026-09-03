import axios from 'axios';

export async function getDestinations() {
  const res = await axios.get('/api/destinations');
  // API returns { count, destinations }
  return res.data.destinations || [];
}

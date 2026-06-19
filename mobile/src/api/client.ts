import axios from 'axios';

const client = axios.create({
  baseURL: 'https://file.vkanis.xyz/',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;

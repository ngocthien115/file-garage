import axios from "axios";

const client = axios.create({
  baseURL: 'https://file.vkanis.xyz/',
  // baseURL: "http://192.168.1.19:8080/",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default client;

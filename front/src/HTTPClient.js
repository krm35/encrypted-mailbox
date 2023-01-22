import axios from 'axios';

const baseUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:8080" : "");

export const HTTPClient = axios.create({
    baseURL: baseUrl,
    withCredentials: true
});

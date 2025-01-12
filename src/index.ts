import { Hono } from 'hono'
import apiV1Router from './routes';

const app = new Hono()
app.route("/api/v1", apiV1Router); 

export default app;

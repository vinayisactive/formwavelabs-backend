import { Hono } from 'hono'
import apiV1Router from './routes';
import { cors } from 'hono/cors';

const app = new Hono()

app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  );


app.route("/api/v1", apiV1Router); 

export default app;

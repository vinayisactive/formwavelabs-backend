import { Hono } from 'hono'
import apiV1Router from './routes';
import { cors } from 'hono/cors';

const app = new Hono()

app.use(
    '/api/*',
    cors({
      origin: ['https://formwavelabs-frontend.vercel.app', 'http://localhost:3000'], 
      credentials: true,  
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH' ,'OPTIONS'], 
      allowHeaders: ['Content-Type', 'Authorization'], 
    })
  );


app.route("/api/v1", apiV1Router); 

export default app;

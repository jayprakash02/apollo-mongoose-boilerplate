import 'dotenv/config';
import App from "./app";
import UserController from './user/user.controller';


const app = new App([
    new UserController()
]);

app.listen(4000)
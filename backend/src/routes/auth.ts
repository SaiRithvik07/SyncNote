import { Router } from 'express';
import { AuthController, registerSchema, loginSchema } from '../controllers/auth';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

export default router;

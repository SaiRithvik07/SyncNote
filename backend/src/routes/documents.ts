import { Router } from 'express';
import { DocumentController, createDocumentSchema, updateDocumentSchema } from '../controllers/documents';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

const router = Router();

// Secure all document routes
router.use(authenticate);

router.post('/', validate(createDocumentSchema), DocumentController.create);
router.get('/', DocumentController.getAll);

router.get('/:id', authorize('VIEWER'), DocumentController.getOne);
router.patch('/:id', authorize('EDITOR'), validate(updateDocumentSchema), DocumentController.update);
router.delete('/:id', authorize('OWNER'), DocumentController.delete);

export default router;

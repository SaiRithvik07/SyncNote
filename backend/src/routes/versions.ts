import { Router } from 'express';
import { VersionController, createVersionSchema } from '../controllers/versions';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', authorize('EDITOR'), validate(createVersionSchema), VersionController.create);
router.get('/', authorize('VIEWER'), VersionController.getAll);
router.post('/:id/restore', authorize('EDITOR'), VersionController.restore);

export default router;

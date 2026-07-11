import { Router } from 'express';
import { CollaboratorController, addCollaboratorSchema, updateCollaboratorSchema } from '../controllers/collaborators';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';

// mergeParams is required to capture documentId parameter from parent router URL
const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', authorize('OWNER'), validate(addCollaboratorSchema), CollaboratorController.add);
router.get('/', authorize('VIEWER'), CollaboratorController.getAll);
router.patch('/:userId', authorize('OWNER'), validate(updateCollaboratorSchema), CollaboratorController.update);
router.delete('/:userId', authorize('OWNER'), CollaboratorController.remove);

export default router;

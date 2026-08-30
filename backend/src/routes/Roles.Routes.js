import express from 'express';
import {
    createRole,
    updateRole,
    getRolesByBranch,
    getRoleById,
    softDeleteRole,
    restoreRole
} from '../controllers/Roles.Controller.js';

const RolesRouter = express.Router();

RolesRouter.post('/createRole', createRole);
RolesRouter.put('/updateRole/:role_id', updateRole);
RolesRouter.get('/getRolesByBranch/:branch_id', getRolesByBranch);
RolesRouter.get('/getRoleById/:role_id', getRoleById);
RolesRouter.delete('/softDeleteRole/:role_id', softDeleteRole);
RolesRouter.put('/restoreRole/:role_id', restoreRole);

export default RolesRouter;
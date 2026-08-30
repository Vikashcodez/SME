// routes/departmentRoutes.js
import express from 'express';
import {
    createDepartment,
    updateDepartment,
    getDepartmentsByBranch,
    getDepartmentById,
    softDeleteDepartment,
    restoreDepartment,
    getDepartmentsWithEmployeeCount,
    bulkSoftDeleteDepartments
} from '../controllers/Departments.Controller.js';

const departmentRouter = express.Router();


departmentRouter.post('/', createDepartment);
departmentRouter.put('/:department_id', updateDepartment);
departmentRouter.get('/branch/:branch_id', getDepartmentsByBranch);
departmentRouter.get('/branch/:branch_id/with-count', getDepartmentsWithEmployeeCount);
departmentRouter.get('/:department_id', getDepartmentById);
departmentRouter.delete('/:department_id', softDeleteDepartment);
departmentRouter.put('/:department_id/restore', restoreDepartment);
departmentRouter.delete('/bulk/delete', bulkSoftDeleteDepartments);

export default departmentRouter;
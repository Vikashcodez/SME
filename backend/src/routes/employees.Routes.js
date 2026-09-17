import express from 'express';
import {
    createEmployee,
    updateEmployee,
    getEmployees,
    getEmployeeById,
    deleteEmployee,
    resetEmployeePassword,
    changeEmployeePassword
} from '../controllers/employees.Controller.js';

const employeesRouter = express.Router();


employeesRouter.post('/', createEmployee);
employeesRouter.get('/', getEmployees);
employeesRouter.get('/:employee_id', getEmployeeById);
employeesRouter.put('/:employee_id', updateEmployee);
employeesRouter.delete('/:employee_id', deleteEmployee);
employeesRouter.put('/reset-password/:employee_id', resetEmployeePassword);
employeesRouter.put('/change-password/:employee_id', changeEmployeePassword);

export default employeesRouter;
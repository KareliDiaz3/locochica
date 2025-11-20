// backend/routes/usuarioRoutes.js
// Rutas para operaciones de cuenta (perfil, desactivación, reactivación)

const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/authMiddleware');
const usuarioController = require('../controllers/usuarioController');

// Gestión de estado de cuenta (requiere sesión activa)
router.post('/desactivar', verificarToken, usuarioController.desactivarCuenta);
router.delete('/eliminar', verificarToken, usuarioController.eliminarCuenta);

// Reactivación: se permite sin token para cuentas desactivadas/eliminadas
router.post('/reactivar/:id', usuarioController.reactivarCuenta);

module.exports = router;

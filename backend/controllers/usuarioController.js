// backend/controllers/usuarioController.js
// Controlador para operaciones de cuenta del usuario (desactivar, eliminar, reactivar)

const database = require('../config/database');

const REACTIVATION_WINDOW_DAYS = 30;

exports.desactivarCuenta = async (req, res) => {
    try {
        const usuarioId = req.user.id;

        await database.query(
            'UPDATE usuarios SET estado_cuenta = "desactivado", ultimo_acceso = NOW() WHERE id = ? LIMIT 1',
            [usuarioId]
        );

        res.json({
            success: true,
            message: 'Cuenta desactivada temporalmente',
            data: {
                reactivar_hasta: Date.now() + (REACTIVATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
            }
        });
    } catch (error) {
        console.error('❌ Error desactivando cuenta:', error);
        res.status(500).json({
            success: false,
            error: 'No se pudo desactivar la cuenta'
        });
    }
};

exports.eliminarCuenta = async (req, res) => {
    try {
        const usuarioId = req.user.id;

        await database.query(
            'UPDATE usuarios SET estado_cuenta = "eliminado", ultimo_acceso = NOW() WHERE id = ? LIMIT 1',
            [usuarioId]
        );

        res.json({
            success: true,
            message: 'Cuenta marcada para eliminación. Puedes reactivarla en los próximos 30 días iniciando sesión nuevamente.',
            data: {
                reactivar_hasta: Date.now() + (REACTIVATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
            }
        });
    } catch (error) {
        console.error('❌ Error eliminando cuenta:', error);
        res.status(500).json({
            success: false,
            error: 'No se pudo eliminar la cuenta'
        });
    }
};

exports.reactivarCuenta = async (req, res) => {
    const { email } = req.body || {};
    const requestedId = req.params.id;

    if (!email) {
        return res.status(400).json({
            success: false,
            error: 'El email es requerido para reactivar la cuenta'
        });
    }

    try {
        const condiciones = [];
        const valores = [];

        if (requestedId && requestedId !== 'self') {
            condiciones.push('id = ?');
            valores.push(requestedId);
        }

        condiciones.push('correo = ?');
        valores.push(email);

        const whereClause = condiciones.join(' OR ');
        const [usuarios] = await database.query(
            `SELECT id, correo, estado_cuenta FROM usuarios WHERE ${whereClause} LIMIT 1`,
            valores
        );

        if (!usuarios.length) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado para reactivación'
            });
        }

        const usuario = usuarios[0];

        if (usuario.estado_cuenta === 'activo') {
            return res.json({
                success: true,
                message: 'La cuenta ya está activa'
            });
        }

        await database.query(
            'UPDATE usuarios SET estado_cuenta = "activo", ultimo_acceso = NOW() WHERE id = ? LIMIT 1',
            [usuario.id]
        );

        res.json({
            success: true,
            message: 'Cuenta reactivada exitosamente',
            data: {
                id: usuario.id,
                correo: usuario.correo
            }
        });
    } catch (error) {
        console.error('❌ Error reactivando cuenta:', error);
        res.status(500).json({
            success: false,
            error: 'No se pudo reactivar la cuenta'
        });
    }
};

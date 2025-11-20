// ==========================================================
// server.js - SpeakLexi Backend - COMPLETO CON MÓDULO 4
// ==========================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// ==========================================================
// IMPORTAR CONFIGURACIÓN DE BASE DE DATOS
// ==========================================================

const { initializeDatabase, testConnection } = require('./config/database');

// ==========================================================
// IMPORTAR RUTAS
// ==========================================================

const authRoutes = require('./routes/auth-routes');
const leccionRoutes = require('./routes/leccionRoutes');
const multimediaRoutes = require('./routes/multimediaRoutes');
const cursosRoutes = require('./routes/cursosRoutes');
const ejercicioRoutes = require('./routes/ejercicioRoutes');

// ==========================================================
// IMPORTAR RUTAS DE MÓDULO 3: GESTIÓN DE APRENDIZAJE
// ==========================================================
const progresoRoutes = require('./routes/progresoRoutes');
const gamificacionRoutes = require('./routes/gamificacionRoutes');
const estadisticasRoutes = require('./routes/estadisticasRoutes');
const retroalimentacionRoutes = require('./routes/retroalimentacionRoutes');
const planificacionRoutes = require('./routes/planificacionRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');

// ==========================================================
// IMPORTAR RUTAS DE MÓDULO 4: GESTIÓN DE DESEMPEÑO
// ==========================================================
const profesorRoutes = require('./routes/profesorRoutes');
const estudianteRoutes = require('./routes/estudianteRoutes');

// ==========================================================
// RUTAS DE TESTING (SOLO DESARROLLO)
// ==========================================================
let testingRoutes = null;
if (process.env.NODE_ENV === 'development') {
    try {
        testingRoutes = require('./routes/testingRoutes');
        console.log('🧪 Rutas de testing cargadas (solo desarrollo)');
    } catch (error) {
        console.log('⚠️  No se pudieron cargar las rutas de testing:', error.message);
    }
}

const app = express();

// ==========================================================
// INICIALIZACIÓN DE BASE DE DATOS
// ==========================================================

const initializeApp = async () => {
  console.log('🔧 Inicializando aplicación SpeakLexi...');
  
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.log('⚠️  ADVERTENCIA: Base de datos no disponible');
    console.log('📝 El servidor arrancará pero las funciones de base de datos fallarán');
  } else {
    console.log('✅ Base de datos conectada correctamente');
  }

  console.log('✅ Aplicación inicializada correctamente');
};

// ==========================================================
// MIDDLEWARES
// ==========================================================

// Seguridad
app.use(helmet());

// Rate limiting (excluir rutas de testing en desarrollo)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    error: 'Demasiadas peticiones desde esta IP, intenta más tarde.'
  },
  skip: (req, res) => {
    // Excluir rutas de testing del rate limiting en desarrollo
    if (process.env.NODE_ENV === 'development' && req.path.startsWith('/api/testing')) {
      return true;
    }
    return false;
  }
});
app.use(limiter);

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy: Origen no permitido';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================================
// RUTAS - TODAS REGISTRADAS
// ==========================================================

app.use('/api/auth', authRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/lecciones', leccionRoutes);
app.use('/api/multimedia', multimediaRoutes);
app.use('/api/cursos', cursosRoutes);
app.use('/api/ejercicios', ejercicioRoutes);

// ==========================================================
// RUTAS DE MÓDULO 3: GESTIÓN DE APRENDIZAJE
// ==========================================================
app.use('/api/progreso', progresoRoutes);
app.use('/api/gamificacion', gamificacionRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/retroalimentacion', retroalimentacionRoutes);
app.use('/api/planificacion', planificacionRoutes);

console.log('✅ Módulo 3 (Aprendizaje) registrado');

// ==========================================================
// RUTAS DE MÓDULO 4: GESTIÓN DE DESEMPEÑO
// ==========================================================
app.use('/api/profesor', profesorRoutes);
app.use('/api/estudiante', estudianteRoutes);

console.log('✅ Módulo 4 (Desempeño) registrado');

// ==========================================================
// RUTAS DE TESTING (SOLO EN DESARROLLO)
// ==========================================================

if (process.env.NODE_ENV === 'development' && testingRoutes) {
    app.use('/api/testing', testingRoutes);
    console.log('✅ Rutas de testing registradas en /api/testing');
} else if (process.env.NODE_ENV !== 'development') {
    console.log('🚫 Rutas de testing deshabilitadas en producción');
}

// ==========================================================
// RUTAS BÁSICAS DEL SISTEMA (ACTUALIZADAS)
// ==========================================================

app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  
  const services = {
      database: dbStatus ? 'connected' : 'disconnected',
      authentication: 'available',
      lessons: 'available',
      multimedia: 'available',
      courses: 'available',
      exercises: 'available',
      email: 'available',
      // AGREGAR SERVICIOS DEL MÓDULO 3
      progress: 'available',
      gamification: 'available',
      statistics: 'available',
      feedback: 'available',
      planning: 'available',
      // AGREGAR SERVICIOS DEL MÓDULO 4
      professor: 'available',
      student: 'available'
  };

  // Agregar servicio de testing solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
      services.testing = 'available';
  }

  res.json({ 
    status: 'OK', 
    message: 'SpeakLexi API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: services
  });
});

app.get('/api/config', (req, res) => {
  const features = {
      auth: true,
      users: false,
      lessons: true,
      multimedia: true,
      courses: true,
      exercises: true,
      // AGREGAR FEATURES DEL MÓDULO 3
      progress: true,
      gamification: true,
      statistics: true,
      feedback: true,
      planning: true,
      // AGREGAR FEATURES DEL MÓDULO 4
      professor: true,
      student: true
  };

  const endpoints = {
      auth: '/api/auth',
      lecciones: '/api/lecciones',
      multimedia: '/api/multimedia',
      cursos: '/api/cursos',
      ejercicios: '/api/ejercicios',
      // AGREGAR ENDPOINTS DEL MÓDULO 3
      progreso: '/api/progreso',
      gamificacion: '/api/gamificacion',
      estadisticas: '/api/estadisticas',
      retroalimentacion: '/api/retroalimentacion',
      planificacion: '/api/planificacion',
      // AGREGAR ENDPOINTS DEL MÓDULO 4
      profesor: '/api/profesor',
      estudiante: '/api/estudiante',
      health: '/api/health',
      config: '/api/config'
  };

  // Agregar testing solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
      features.testing = true;
      endpoints.testing = '/api/testing';
  }

  res.json({
    appName: 'SpeakLexi',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    features: features,
    endpoints: endpoints
  });
});

app.get('/', (req, res) => {
  const availableEndpoints = [
    'GET  /api/health - Estado del sistema',
    'GET  /api/config - Configuración',
    
    '--- AUTENTICACIÓN ---',
    'POST /api/auth/registro - Registro de usuario',
    'POST /api/auth/login - Inicio de sesión',
    'POST /api/auth/verificar - Verificación de email',
    
    '--- CURSOS ---',
    'GET  /api/cursos - Listar todos los cursos',
    'GET  /api/cursos/:id - Obtener curso específico',
    'POST /api/cursos - Crear nuevo curso',
    'GET  /api/cursos/:id/lecciones - Lecciones del curso',
    'POST /api/cursos/:id/inscribir - Inscribirse',
    
    '--- LECCIONES ---',
    'GET  /api/lecciones - Listar lecciones',
    'GET  /api/lecciones/:id - Obtener lección específica',
    'POST /api/lecciones - Crear nueva lección',
    'PUT  /api/lecciones/:id - Actualizar lección',
    
    '--- EJERCICIOS ---', 
    'GET  /api/ejercicios/leccion/:leccion_id - Ejercicios de lección',
    'POST /api/ejercicios - Crear ejercicio',
    'PUT  /api/ejercicios/:id - Actualizar ejercicio',
    'POST /api/ejercicios/:id/validar - Validar respuesta',
    
    '--- MULTIMEDIA ---',
    'GET  /api/multimedia/leccion/:leccionId - Multimedia de lección',
    'POST /api/multimedia/subir - Subir archivo',
    'DELETE /api/multimedia/:id - Eliminar archivo',

    '--- PROGRESO Y APRENDIZAJE ---',
    'GET  /api/progreso/resumen - Resumen del dashboard',
    'GET  /api/progreso/lecciones-recomendadas - Lecciones recomendadas',
    'POST /api/progreso/registrar - Registrar progreso',
    'GET  /api/progreso/historial - Historial de progreso',
    'GET  /api/gamificacion/puntos - Puntos y logros',
    'GET  /api/estadisticas/rendimiento - Estadísticas de rendimiento',

    '--- GESTIÓN DE DESEMPEÑO (MÓDULO 4) ---',
    'GET  /api/profesor/dashboard - Dashboard del profesor',
    'GET  /api/profesor/estudiantes - Lista de estudiantes asignados',
    'POST /api/profesor/retroalimentacion - Enviar retroalimentación',
    'GET  /api/profesor/estadisticas - Estadísticas de estudiantes',
    'POST /api/profesor/planes - Crear plan de estudio',
    'GET  /api/estudiante/retroalimentacion - Retroalimentación recibida',
    'POST /api/estudiante/retroalimentacion/:id/marcar-leido - Marcar como leído'
  ];

  // Agregar endpoints de testing solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    availableEndpoints.push(
      '--- TESTING (Solo Desarrollo) ---',
      'GET  /api/testing/status - Estado del sistema de testing',
      'GET  /api/testing/estadisticas - Estadísticas de datos de prueba',
      'POST /api/testing/generar-usuarios - Generar usuarios de prueba',
      'POST /api/testing/generar-progreso - Generar progreso aleatorio',
      'DELETE /api/testing/limpiar-datos - Eliminar todos los datos de prueba'
    );
  }

  res.json({ 
    message: 'Bienvenido a SpeakLexi API',
    version: '1.0.0',
    description: 'Sistema de aprendizaje de idiomas',
    environment: process.env.NODE_ENV || 'development',
    availableEndpoints: availableEndpoints,
    documentation: 'Consulta la documentación para más detalles'
  });
});

// ==========================================================
// MANEJO DE ERRORES (MEJORADO)
// ==========================================================

app.use('*', (req, res) => {
  const availableEndpoints = [
    '/api/health', 
    '/api/config', 
    '/api/auth/*',
    '/api/cursos/*',
    '/api/lecciones/*',
    '/api/multimedia/*',
    '/api/ejercicios/*',
    // AGREGAR ENDPOINTS DEL MÓDULO 3
    '/api/progreso/*',
    '/api/gamificacion/*',
    '/api/estadisticas/*',
    '/api/retroalimentacion/*',
    '/api/planificacion/*',
    // AGREGAR ENDPOINTS DEL MÓDULO 4
    '/api/profesor/*',
    '/api/estudiante/*'
  ];

  // Agregar testing solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    availableEndpoints.push('/api/testing/*');
  }

  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: availableEndpoints,
    suggestion: 'Verifica la URL o consulta GET / para ver endpoints disponibles'
  });
});

app.use((error, req, res, next) => {
  console.error('❌ Error del servidor:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON malformado en el cuerpo de la petición',
      suggestion: 'Verifica que tu JSON sea válido'
    });
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(503).json({
      error: 'Servicio de base de datos no disponible',
      message: 'Intenta nuevamente en unos momentos'
    });
  }
  
  // Manejar errores de testing específicos
  if (req.path.startsWith('/api/testing')) {
    return res.status(500).json({
      error: 'Error en sistema de testing',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
      development: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        details: 'Verifica la consola del servidor para más detalles'
      } : undefined
    });
  }
  
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal. Por favor, intenta nuevamente.'
  });
});

// ==========================================================
// INICIAR SERVIDOR (ACTUALIZADO)
// ==========================================================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

initializeApp().then(() => {
  app.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Servidor SpeakLexi INICIADO CORRECTAMENTE');
    console.log('='.repeat(60));
    console.log(`📍 URL: http://${HOST}:${PORT}`);
    console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Autenticación: http://${HOST}:${PORT}/api/auth`);
    console.log(`📚 Cursos: http://${HOST}:${PORT}/api/cursos`);
    console.log(`📖 Lecciones: http://${HOST}:${PORT}/api/lecciones`);
    console.log(`🎯 Ejercicios: http://${HOST}:${PORT}/api/ejercicios`);
    console.log(`🎬 Multimedia: http://${HOST}:${PORT}/api/multimedia`);
    
    // MOSTRAR MÓDULO 3
    console.log(`📈 Progreso: http://${HOST}:${PORT}/api/progreso`);
    console.log(`🏆 Gamificación: http://${HOST}:${PORT}/api/gamificacion`);
    console.log(`📊 Estadísticas: http://${HOST}:${PORT}/api/estadisticas`);
    console.log(`💬 Retroalimentación: http://${HOST}:${PORT}/api/retroalimentacion`);
    console.log(`📅 Planificación: http://${HOST}:${PORT}/api/planificacion`);
    
    // MOSTRAR MÓDULO 4
    console.log(`👨‍🏫 Profesor: http://${HOST}:${PORT}/api/profesor`);
    console.log(`👨‍🎓 Estudiante: http://${HOST}:${PORT}/api/estudiante`);
    
    // Mostrar testing solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧪 Testing: http://${HOST}:${PORT}/api/testing`);
      console.log(`🔧 Generador: http://localhost:3000/pages/testing/generador-datos.html`);
    }
    
    console.log(`❤️  Health: http://${HOST}:${PORT}/api/health`);
    console.log(`📝 Config: http://${HOST}:${PORT}/api/config`);
    console.log('='.repeat(60));
    
    // Mensaje especial para testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 GENERADOR DE DATOS DISPONIBLE:');
      console.log('   • Abre: http://localhost:3000/pages/testing/generador-datos.html');
      console.log('   • Token: speaklexi-test-2024');
      console.log('   • Password: Test123!');
      console.log('='.repeat(60));
    }
    
    console.log('✅ ¡Backend listo para recibir peticiones!');
    console.log('='.repeat(60) + '\n');
  });
}).catch(error => {
  console.error('❌ Error fatal inicializando la aplicación:', error);
  process.exit(1);
});

// ==========================================================
// MANEJO DE SEÑALES DE CIERRE
// ==========================================================

process.on('SIGINT', () => {
  console.log('\n🔻 Recibida señal de cierre (SIGINT)');
  console.log('👋 Cerrando servidor SpeakLexi...');
  console.log('✅ Servidor cerrado correctamente');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔻 Recibida señal de terminación (SIGTERM)');
  console.log('👋 Cerrando servidor SpeakLexi...');
  console.log('✅ Servidor cerrado correctamente');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  console.log('🔄 Reiniciando servidor...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.log('🔄 Continuando ejecución...');
});

module.exports = app;
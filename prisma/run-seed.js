try {
    require('./seed.js');
} catch (e) {
    console.error('SEED ERROR:', e.message);
    console.error('STACK:', e.stack);
}

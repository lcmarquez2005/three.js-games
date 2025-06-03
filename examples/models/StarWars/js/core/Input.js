export class Input {
  constructor() {
    this.keys = {};
    this.mouseDown = false;
    this.handTrackingActive = false;
    this.pinchGesture = false;
    this.leftHandPinch = false;
    this.rightHandPinch = false;
    
    // Eventos de teclado
    document.addEventListener('keydown', (e) => this.keys[e.code] = true);
    document.addEventListener('keyup', (e) => delete this.keys[e.code]);
    
    // Eventos de mouse
    window.addEventListener('mousedown', () => {
      this.mouseDown = true;
    });

    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    
    document.addEventListener('mouseleave', () => {
      this.mouseDown = false;
    });
    
    // Soporte táctil para móviles
    window.addEventListener('touchstart', () => {
      this.mouseDown = true;
    });

    window.addEventListener('touchend', () => {
      this.mouseDown = false;
    });
    
    // Inicializar hand tracking si estamos en Meta Quest
    this.initHandTracking();
  }
  
  initHandTracking() {
    // Verificar si estamos en un entorno WebXR con soporte para hand tracking
    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
          this.handTrackingActive = true;
          console.log("Hand tracking disponible");
        }
      });
    }
  }
  
  updateHandTracking(frame) {
    if (!this.handTrackingActive || !frame) return;
    
    // Obtener las manos detectadas
    const hands = frame.get("hand-tracking");
    if (!hands) return;
    
    // Resetear estados previos
    this.leftHandPinch = false;
    this.rightHandPinch = false;
    this.pinchGesture = false;
    
    // Procesar cada mano
    for (const hand of hands.values()) {
      if (hand.hand === 'left') {
        this.leftHandPinch = this.checkPinchGesture(hand);
      } else if (hand.hand === 'right') {
        this.rightHandPinch = this.checkPinchGesture(hand);
      }
    }
    
    // Actualizar el estado general de pinch
    this.pinchGesture = this.leftHandPinch || this.rightHandPinch;
  }
  
  checkPinchGesture(hand) {
    // Índices de los joints según WebXR Hand Tracking
    const THUMB_TIP = 4;
    const INDEX_TIP = 8;
    
    // Obtener las posiciones de las puntas de los dedos
    const thumbTip = hand.joints[THUMB_TIP].position;
    const indexTip = hand.joints[INDEX_TIP].position;
    
    // Calcular distancia entre los dedos
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dz = thumbTip.z - indexTip.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Consideramos un "pinch" si la distancia es menor a 0.02 metros (2cm)
    return distance < 0.02;
  }
  
  isKeyPressed(code) {
    return this.keys[code] || false;
  }
  
  isMouseDown() {
    return this.mouseDown || this.pinchGesture;
  }
  
  isPinching() {
    return this.pinchGesture;
  }
  
  isLeftHandPinching() {
    return this.leftHandPinch;
  }
  
  isRightHandPinching() {
    return this.rightHandPinch;
  }
    isShooting() {
    return this.mouseDown || this.keys['Space'];
  }
}

// Ejemplo mínimo de implementación de input
export class Input {
  constructor() {
    this.keys = {};
    this.mouseDown = false; // Propiedad, no método
    
    // Eventos de teclado
    document.addEventListener('keydown', (e) => this.keys[e.code] = true);
    document.addEventListener('keyup', (e) => delete this.keys[e.code]);
    
    // Eventos de mouse CORREGIDOS
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Solo botón izquierdo
        this.mouseDown = true;
        console.log("Mouse down");
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseDown = false;
      }
    });
    
    document.addEventListener('mouseleave', () => {
      this.mouseDown = false;
    });
  }

  isKeyPressed(code) {
    return this.keys[code] || false;
  }
}
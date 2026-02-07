
export const LIB_VECTOR = `
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this._clean();
    }

    // PHASE 2 DEFENSE: Self-Healing Mechanism
    // If a vector becomes NaN or Infinity, reset it to 0 to prevent canvas crashes.
    _clean() {
        if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
            this.x = 0;
            this.y = 0;
            // Optional: console.warn('Vector healed from NaN');
        }
        return this;
    }
    
    set(x, y) {
        if (typeof x === 'object' && x !== null) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
        return this._clean();
    }

    add(v) { 
        if (typeof v === 'number') { this.x += v; this.y += v; }
        else { this.x += v.x; this.y += v.y; }
        return this._clean(); 
    }
    
    sub(v) { 
        if (typeof v === 'number') { this.x -= v; this.y -= v; }
        else { this.x -= v.x; this.y -= v.y; }
        return this._clean(); 
    }
    
    multiply(s) { this.x *= s; this.y *= s; return this._clean(); }
    mult(s) { return this.multiply(s); } // Alias
    multiplyScalar(s) { return this.multiply(s); } // Alias
    
    divide(s) { 
        if (s !== 0) { this.x /= s; this.y /= s; } 
        else { this.x = 0; this.y = 0; } // Handle divide by zero
        return this._clean(); 
    }
    div(s) { return this.divide(s); } // Alias
    
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    magSq() { return this.x * this.x + this.y * this.y; }
    
    normalize() { 
        const m = this.mag(); 
        if (m > 0) this.divide(m); 
        else { this.x = 0; this.y = 0; }
        return this._clean(); 
    }
    
    setMag(n) { return this.normalize().multiply(n); }
    limit(max) { if (this.magSq() > max * max) this.setMag(max); return this._clean(); }
    
    heading() { return Math.atan2(this.y, this.x); }
    
    rotate(angle) {
        const newHeading = this.heading() + angle;
        const mag = this.mag();
        this.x = Math.cos(newHeading) * mag;
        this.y = Math.sin(newHeading) * mag;
        return this._clean();
    }
    
    dist(v) { 
        const dx = this.x - v.x; 
        const dy = this.y - v.y; 
        return Math.sqrt(dx * dx + dy * dy); 
    }
    distSq(v) {
        const dx = this.x - v.x; 
        const dy = this.y - v.y; 
        return dx * dx + dy * dy;
    }
    
    dot(v) { return this.x * v.x + this.y * v.y; }
    
    cross(v) { return this.x * v.y - this.y * v.x; }
    
    lerp(v, amt) {
        this.x += (v.x - this.x) * amt;
        this.y += (v.y - this.y) * amt;
        return this._clean();
    }

    copy() { return new Vector(this.x, this.y); }
    
    static random2D() { const a = Math.random() * Math.PI * 2; return new Vector(Math.cos(a), Math.sin(a)); }
    static fromAngle(angle, length = 1) { return new Vector(length * Math.cos(angle), length * Math.sin(angle)); }
    
    // --- STATIC MATH (p5.js style compatibility) ---
    static add(v1, v2) { return new Vector(v1.x + v2.x, v1.y + v2.y); }
    static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
    static mult(v, n) { return new Vector(v.x * n, v.y * n); }
    static div(v, n) { return new Vector(v.x / n, v.y / n); }
    static dist(v1, v2) { return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)); }
    static distance(v1, v2) { return Vector.dist(v1, v2); }
}
`;
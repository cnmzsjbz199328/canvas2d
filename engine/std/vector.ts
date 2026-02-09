
export const LIB_VECTOR = `
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this._clean();
    }

    // 🛡️ Self-Healing Mechanism
    _clean() {
        if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
            this.x = 0;
            this.y = 0;
        }
        return this;
    }
    
    // --- INSTANCE METHODS (Legacy Support) ---
    set(x, y) {
        if (typeof x === 'object' && x !== null) { this.x = x.x; this.y = x.y; }
        else { this.x = x; this.y = y; }
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
    
    mult(s) { this.x *= s; this.y *= s; return this._clean(); }
    div(s) { if (s !== 0) { this.x /= s; this.y /= s; } else { this.x = 0; this.y = 0; } return this._clean(); }
    
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    magSq() { return this.x * this.x + this.y * this.y; }
    
    normalize() { 
        const m = this.mag(); 
        if (m > 0) this.div(m); 
        return this._clean(); 
    }
    
    limit(max) { if (this.magSq() > max * max) this.setMag(max); return this._clean(); }
    setMag(n) { return this.normalize().mult(n); }
    heading() { return Math.atan2(this.y, this.x); }
    rotate(angle) {
        const newHeading = this.heading() + angle;
        const mag = this.mag();
        this.x = Math.cos(newHeading) * mag;
        this.y = Math.sin(newHeading) * mag;
        return this._clean();
    }
    lerp(v, amt) {
        this.x += (v.x - this.x) * amt;
        this.y += (v.y - this.y) * amt;
        return this._clean();
    }
    dist(v) { return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2)); }
    copy() { return new Vector(this.x, this.y); }

    // --- STATIC METHODS (V2 Standard Compliance) ---
    // ✅ CRITICAL: All methods return NEW vectors and do NOT modify inputs
    
    // Basic Operations
    static add(v1, v2) { return new Vector(v1.x + v2.x, v1.y + v2.y); }
    static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
    static mult(v, n) { return new Vector(v.x * n, v.y * n); }
    static mul(v, n) { return Vector.mult(v, n); } // Alias for AI compatibility
    static div(v, n) { return new Vector(v.x / n, v.y / n); }
    
    // Distance & Magnitude
    static distance(v1, v2) { return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)); }
    static dist(v1, v2) { return Vector.distance(v1, v2); }
    static mag(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
    static magSq(v) { return v.x * v.x + v.y * v.y; }
    
    // Normalization & Limiting
    static normalize(v) {
        const m = Vector.mag(v);
        if (m === 0) return new Vector(0, 0);
        return new Vector(v.x / m, v.y / m);
    }
    static setMag(v, n) {
        const normalized = Vector.normalize(v);
        return Vector.mult(normalized, n);
    }
    static limit(v, max) {
        const mSq = Vector.magSq(v);
        if (mSq > max * max) {
            return Vector.setMag(v, max);
        }
        return new Vector(v.x, v.y);
    }
    
    // Angles & Rotation
    static heading(v) { return Math.atan2(v.y, v.x); }
    static rotate(v, angle) {
        const newHeading = Vector.heading(v) + angle;
        const m = Vector.mag(v);
        return new Vector(Math.cos(newHeading) * m, Math.sin(newHeading) * m);
    }
    static angleBetween(v1, v2) {
        const dot = Vector.dot(v1, v2);
        const val = Math.max(-1, Math.min(1, dot / (Vector.mag(v1) * Vector.mag(v2))));
        return Math.acos(val);
    }
    
    // Interpolation & Products
    static lerp(v1, v2, amt) {
        return new Vector(
            v1.x + (v2.x - v1.x) * amt,
            v1.y + (v2.y - v1.y) * amt
        );
    }
    static dot(v1, v2) { return v1.x * v2.x + v1.y * v2.y; }
    static cross(v1, v2) { return v1.x * v2.y - v1.y * v2.x; } // 2D Cross Product
    
    // Creation
    static random2D() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
    static fromAngle(angle, length = 1) {
        return new Vector(length * Math.cos(angle), length * Math.sin(angle));
    }
}
`;

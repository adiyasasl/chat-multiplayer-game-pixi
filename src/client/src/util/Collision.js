export const Collision = {
    checkCollision(entityA, entityB) {
        // GUARD CLAUSE: If either entity doesn't exist, they can't be colliding!
        if (!entityA || !entityB) {
            return false;
        }

        // Optional: Ensure they actually have a getBounds method to prevent a different error
        if (typeof entityA.getBounds !== 'function' || typeof entityB.getBounds !== 'function') {
            console.warn("Collision check failed: Object is missing getBounds()", {entityA, entityB});
            return false;
        }

        const a = entityA.getBounds();
        const b = entityB.getBounds();

        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
};
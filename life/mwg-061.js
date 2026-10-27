/* MWG 061 — the template's assets/script.js, byte-for-byte as delivered.
   The site's additions (every title cycling through, the poster card) are in
   /life/films-ring.js, so this file stays the template. */
window.addEventListener("DOMContentLoaded", () => {

    const root = document.querySelector('.mwg_effect061')
    const container = root.querySelector('.container')
    const medias = root.querySelectorAll('img')
    const angle = 360 / medias.length
    
    medias.forEach((media, index) => {
        gsap.set(media, {
            z: '-50vw',
            rotationY: angle * index
        })
        gsap.to(container, {
            rotationY: 360,
            repeat: -1,
            ease: 'none',
            duration: 20
        })
    })
    
    const W = window.innerWidth
    const clampX = gsap.utils.clamp(0, W)
    const rotTo = gsap.quickTo(container, 'rotationX', {duration: 1, ease: 'power2'})

    function applyMove(clientX) {
        const safeX = clampX(clientX)
        const normalizedX = (safeX / W) * 2 - 1
        rotTo(normalizedX * 10)
    }

    root.addEventListener('mousemove', handleMouseMove)
    function handleMouseMove(e) {
        applyMove(e.clientX)
    }
    function handleTouchMove(e) {
        if (!e.touches || !e.touches[0]) return
        applyMove(e.touches[0].clientX)
    }

    root.addEventListener("touchstart", handleTouchMove, {passive: true})
    root.addEventListener("touchmove", handleTouchMove, {passive: true})
})
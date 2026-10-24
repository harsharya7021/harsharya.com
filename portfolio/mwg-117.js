/* MWG 117 — the template's assets/script.js, as delivered. Unchanged. */
window.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector('.mwg_effect117')
    
    const layers = [...root.querySelectorAll('.layer')]
    const pager = root.querySelector('.pager')
    const mediaGroups = [...root.querySelectorAll('.media-pool > div')].map(group =>
        [...group.querySelectorAll('img')].map(img => img.src)
    )
    const words = [...root.querySelectorAll('.word')]
    let current = 0
    let isAnimating = false
    let activeMedias = []
    let pointer = { x: 0, y: 0 }

    // The closer the layer is (higher index), the stronger the parallax effect.
    const PARALLAX = [18, 36, 64]

    const marks = [...pager.querySelectorAll('li')]
    marks[0].classList.add('is-active')

    gsap.set(words, { autoAlpha: 0, scale: 1 })
    gsap.set(words[0], { autoAlpha: 1 })
    words[0].classList.add('is-active')

    function setPager(index) {
        marks.forEach((mark, i) => {
            mark.classList.toggle('is-active', i === index)
        })
    }

    function shuffledLayerIds(count) {
        const ids = Array.from({ length: count }, (_, i) => i % layers.length)
        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[ids[i], ids[j]] = [ids[j], ids[i]]
        }
        return ids
    }

    function applyParallax() {
        activeMedias.forEach(item => {
            item.xTo(item.baseX - pointer.x * item.strength * 2)
            item.yTo(item.baseY - pointer.y * item.strength * 2)
        })
    }

    function dismissMedias() {
        const outgoing = activeMedias.splice(0)
        outgoing.forEach((item, i) => {
            gsap.to(item.el, {
                scale: 0.7,
                autoAlpha: 0,
                duration: 0.28,
                ease: 'expo.in',
                delay: i * 0.015,
                onComplete: () => item.el.remove()
            })
        })
    }

    function showMedias(index = current) {
        const srcs = mediaGroups[index] || []
        const count = srcs.length
        const layerIds = shuffledLayerIds(count)
        const radius = Math.min(window.innerWidth, window.innerHeight) * 0.32
        const startAngle = Math.random() * Math.PI * 2
        const medias = []

        srcs.forEach((src, i) => {
            const layerIndex = layerIds[i]
            const layer = layers[layerIndex]

            const el = document.createElement('img')
            el.className = 'media'
            el.src = src
            layer.appendChild(el)

            const angle = startAngle + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35
            const dist = radius * (0.75 + Math.random() * 0.45)
            const baseX = Math.cos(angle) * dist
            const baseY = Math.sin(angle) * dist
            const rot = (Math.random() - 0.5) * 28

            gsap.fromTo(el, {
                xPercent: -50,
                yPercent: -50,
                x: baseX * 0.15,
                y: baseY * 0.15,
                rotation: rot * 0.3,
                scale: 0.35,
                autoAlpha: 0,
            }, {
                xPercent: -50,
                yPercent: -50,
                x: baseX - pointer.x * PARALLAX[layerIndex] * 2,
                y: baseY - pointer.y * PARALLAX[layerIndex] * 2,
                rotation: rot,
                scale: 1,
                autoAlpha: 1,
                duration: 0.55,
                ease: 'expo.out',
                delay: i * 0.02,
            })

            medias.push({
                el,
                baseX,
                baseY,
                strength: PARALLAX[layerIndex],
                xTo: gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }),
                yTo: gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' }),
            })
        })

        activeMedias = medias
    }

    function handleMouseMove(e) {
        const rect = root.getBoundingClientRect()
        pointer.x = (e.clientX - rect.left) / rect.width - 0.5
        pointer.y = (e.clientY - rect.top) / rect.height - 0.5
        applyParallax()
    }

    const mm = gsap.matchMedia()
    mm.add('(min-width: 768px)', () => {
        root.addEventListener('mousemove', handleMouseMove)
        return () => {
            root.removeEventListener('mousemove', handleMouseMove)
            pointer.x = 0
            pointer.y = 0
            applyParallax()
        }
    })

    function goTo(index) {
        if (isAnimating || index === current) return
        isAnimating = true

        const outgoing = words[current]
        const incoming = words[index]

        const tl = gsap.timeline({
            onComplete: () => {
                isAnimating = false
            }
        })

        tl.add(() => dismissMedias())
        tl.to(outgoing, {
            scale: 0.82,
            duration: 0.3,
            ease: 'expo.in',
            onComplete: () => {
                gsap.set(outgoing, { autoAlpha: 0 })
                outgoing.classList.remove('is-active')
            }
        }, '<')

        tl.add(() => showMedias(index))

        tl.fromTo(incoming, {
            autoAlpha: 1,
            scale: 0.6,
        }, {
            scale: 1,
            duration: 0.5,
            ease: 'expo.out',
            immediateRender: false,
            onStart: () => {
                incoming.classList.add('is-active')
                setPager(index)
            }
        }, '<')

        current = index
    }

    function goNext() {
        goTo((current + 1) % words.length)
    }

    function handlePagerClick(e) {
        e.stopPropagation()
        const index = marks.indexOf(e.currentTarget)
        if (index === -1) return
        goTo(index)
    }

    showMedias()

    root.addEventListener('click', goNext)
    marks.forEach(mark => mark.addEventListener('click', handlePagerClick))

    const observer = new MutationObserver(mutations => {
        const isRootRemoved = mutations.some(mutation =>
            mutation.type === 'childList' &&
            Array.from(mutation.removedNodes).includes(root)
        )

        if (isRootRemoved) {
            root.removeEventListener('click', goNext)
            mm.revert()
            marks.forEach(mark => mark.removeEventListener('click', handlePagerClick))
            activeMedias.splice(0).forEach(item => item.el.remove())
            observer.disconnect()
        }
    })
    observer.observe(document.body, { childList: true, subtree: true })
})
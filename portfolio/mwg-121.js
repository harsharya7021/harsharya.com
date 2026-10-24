/* MWG 121 — the template's assets/script.js, as delivered. Unchanged. */
window.addEventListener("DOMContentLoaded", () => {

    /* LENIS SMOOTH SCROLL (OPTIONAL) */
    lenis = new Lenis({
        autoRaf: true,
    })
    /* LENIS SMOOTH SCROLL (OPTIONAL) */
    
    const root = document.querySelector('.mwg_effect121')
    const sections = Array.from(root.querySelectorAll('.section'))

    sections.forEach((section) => {
        const media = section.querySelector('.media')
        const img = media && media.querySelector('img')

        if (media) {
            gsap.fromTo(media, {
                clipPath: 'inset(0% 15% 0% 15% round 1vw)'
            }, {
                clipPath: 'inset(0% 0% 0% 0% round 1vw)',
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: media,
                    start: 'top bottom',
                    end: 'top 65%',
                    scrub: true
                }
            })

            gsap.fromTo(media, {
                clipPath: 'inset(0% 0% 0% 0% round 1vw)'
            }, {
                clipPath: 'inset(0% 15% 0% 15% round 1vw)',
                ease: 'power2.in',
                immediateRender: false,
                scrollTrigger: {
                    trigger: media,
                    start: 'bottom 35%',
                    end: 'bottom top',
                    scrub: true
                }
            })
        }

        if (img) {
            gsap.fromTo(img, {
                y: -200
            }, {
                y: 0,
                ease: 'none',
                scrollTrigger: {
                    trigger: media,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            })
        }
    })

    gsap.matchMedia().add('(min-width: 768px)', () => {
        sections.forEach((section, i) => {
            const textLeft = section.querySelector('.text-left')
            if (!textLeft) return

            const nextTextLeft = sections[i + 1] && sections[i + 1].querySelector('.text-left')

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: 'bottom 60%',
                    end: 'bottom 40%',
                    scrub: true
                }
            })

            tl.to(textLeft, {
                yPercent: -15,
                autoAlpha: 0,
                ease: 'power2.inOut'
            }, 0)

            if (nextTextLeft) {
                tl.fromTo(nextTextLeft, {
                    yPercent: 15
                }, {
                    yPercent: 0,
                    ease: 'power2.inOut'
                }, 0)
            }
        })
    })
})
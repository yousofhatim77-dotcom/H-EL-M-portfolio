// ===== State =====
let currentProjectId = null;
let currentProjectData = {};
let isMusicPlaying = false;
let currentLogoPosition = 'left';


// ============================================================
// PROJECT DATA
// ============================================================
// LOCAL_PROJECTS is loaded from projects.generated.js.
// Run build.ps1 after changing the contents of the الصور folder.
// ============================================================


// ============================================================
// VIEWER STATE
// ============================================================

let viewerImages = [];

let viewerIndex = 0;

let viewerZoom = 1;

let viewerDragging = false;

let viewerDragStart = {
    x: 0,
    y: 0
};

let viewerOffset = {
    x: 0,
    y: 0
};


// ============================================================
// DOM REFERENCES
// ============================================================

const projectsContainer =
    document.getElementById('projectsContainer');

const projectModal =
    document.getElementById('projectModal');

const projectModalBody =
    document.getElementById('projectModalBody');

const projectModalTitle =
    document.getElementById('projectModalTitle');

const musicControl =
    document.getElementById('musicControl');

const backgroundMusic =
    document.getElementById('backgroundMusic');

const labLogo =
    document.getElementById('labLogo');

const heroGrid =
    document.getElementById('heroGrid');

const pricingScrollContainer =
    document.getElementById('pricingScrollContainer');

const pricingScrollTrack =
    document.getElementById('pricingScrollTrack');

const pricingScrollWrapper =
    document.getElementById('pricingScrollWrapper');


// ============================================================
// HELPERS
// ============================================================

function showOverlay(element) {

    if (!element) return;

    element.style.display = 'flex';

}


function hideOverlay(element) {

    if (!element) return;

    element.style.display = 'none';

}


// ============================================================
// LOGO POSITIONING - انتقال سلس
// ============================================================

function setLogoPosition(position) {
    if (!labLogo) return;
    if (currentLogoPosition === position) return;
    
    // إزالة جميع الكلاسات السابقة
    labLogo.classList.remove('position-left', 'position-center', 'position-right');
    
    // إضافة الكلاس الجديد مع transition سلس
    if (position === 'left') {
        labLogo.classList.add('position-left');
        labLogo.style.left = '20px';
        labLogo.style.right = 'auto';
        labLogo.style.top = '12px';
        labLogo.style.transform = 'scale(1)';
        labLogo.style.width = '110px';
        labLogo.style.height = '110px';
        labLogo.style.animation = '';
    } else if (position === 'center') {
        labLogo.classList.add('position-center');
        labLogo.style.left = '50%';
        labLogo.style.right = 'auto';
        labLogo.style.top = '50%';
        labLogo.style.transform = 'translate(-50%, -50%) scale(1.3)';
        labLogo.style.width = '160px';
        labLogo.style.height = '160px';
    } else if (position === 'right') {
        labLogo.classList.add('position-right');
        labLogo.style.right = '20px';
        labLogo.style.left = 'auto';
        labLogo.style.top = '12px';
        labLogo.style.transform = 'scale(1)';
        labLogo.style.width = '110px';
        labLogo.style.height = '110px';
        labLogo.style.animation = '';
    }
    
    currentLogoPosition = position;
}


// ============================================================
// MUSIC
// ============================================================

function setupMusic() {

    if (!backgroundMusic || !musicControl) {
        return;
    }

    function updateMusicButton() {

        musicControl.innerHTML = isMusicPlaying
            ? '<i class="fas fa-pause"></i>'
            : '<i class="fas fa-music"></i>';

        musicControl.setAttribute(
            'aria-label',
            isMusicPlaying
                ? 'إيقاف الموسيقى'
                : 'تشغيل الموسيقى'
        );

        musicControl.title =
            isMusicPlaying
                ? 'إيقاف الموسيقى'
                : 'تشغيل الموسيقى';
    }


    function tryPlayMusic() {

        const promise =
            backgroundMusic.play();

        if (
            promise &&
            typeof promise.then === 'function'
        ) {

            promise
                .then(() => {

                    isMusicPlaying = true;

                    updateMusicButton();

                })
                .catch(() => {

                    isMusicPlaying = false;

                    updateMusicButton();

                });

        }

        else {

            isMusicPlaying = true;

            updateMusicButton();

        }

    }


    tryPlayMusic();


    const startAfterInteraction = () => {

        if (!isMusicPlaying) {

            tryPlayMusic();

        }


        document.removeEventListener(
            'pointerdown',
            startAfterInteraction
        );


        document.removeEventListener(
            'keydown',
            startAfterInteraction
        );


        document.removeEventListener(
            'touchstart',
            startAfterInteraction
        );

    };


    document.addEventListener(
        'pointerdown',
        startAfterInteraction,
        {
            passive: true
        }
    );


    document.addEventListener(
        'keydown',
        startAfterInteraction,
        {
            passive: true
        }
    );


    document.addEventListener(
        'touchstart',
        startAfterInteraction,
        {
            passive: true
        }
    );


    musicControl.addEventListener(
        'click',
        e => {

            e.stopPropagation();


            if (isMusicPlaying) {

                backgroundMusic.pause();

                isMusicPlaying = false;

                updateMusicButton();

            }

            else {

                tryPlayMusic();

            }

        }
    );


    updateMusicButton();

}


// ============================================================
// قائمة الأسعار - صور من مجلد price list (بدون أسماء/أرقام)
// ============================================================

const PRICING_IMAGES = [
    { file: 'price list/1.png' },
    { file: 'price list/2.png' },
    { file: 'price list/3.png' },
    { file: 'price list/4.png' },
    { file: 'price list/5.png' },
    { file: 'price list/6.png' }
];


// ============================================================
// تحميل صور المنتجات
// ============================================================

function loadHeroImages() {
    if (!heroGrid) return;

    const projects = LOCAL_PROJECTS.slice(0, 5);

    if (!projects.length) {
        heroGrid.innerHTML = `
            <div class="empty-hint" style="grid-column: 1 / -1;">
                <i class="fas fa-images"></i>
                <p>لا توجد صور لعرضها</p>
            </div>
        `;
        return;
    }

    heroGrid.innerHTML = '';

    projects.forEach((project, index) => {
        const item = document.createElement('div');
        item.className = 'hero-item';

        const img = document.createElement('img');
        img.src = project.cover;
        img.alt = project.name || `صورة ${index + 1}`;
        img.loading = 'lazy';

        img.onerror = function () {
            console.error('صورة غير موجودة:', this.src);
            this.style.display = 'none';
        };

        const label = document.createElement('div');
        label.className = 'hero-label';
        label.textContent = project.name || 'بدون اسم';

        item.addEventListener('click', () => {
            openProject(project.id, project.cover, project.name);
        });

        item.appendChild(img);
        item.appendChild(label);
        heroGrid.appendChild(item);
    });
}


// ============================================================
// تحميل صور قائمة الأسعار (سكرول أفقي - بدون نصوص)
// ============================================================

function loadPricingImages() {
    if (!pricingScrollTrack) return;

    pricingScrollTrack.innerHTML = '';

    PRICING_IMAGES.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'pricing-scroll-item';

        const img = document.createElement('img');
        img.src = item.file;
        img.alt = 'قائمة الأسعار';
        img.loading = 'lazy';

        img.onerror = function () {
            console.error('صورة غير موجودة:', this.src);
        };

        div.addEventListener('click', () => {
            window.open(item.file, '_blank');
        });

        div.appendChild(img);
        pricingScrollTrack.appendChild(div);
    });

    // تمرير إلى المنتصف بعد تحميل الصور
    setTimeout(() => {
        centerPricingScroll();
    }, 150);
}


// ============================================================
// توسيط السكرول الأفقي
// ============================================================

function centerPricingScroll() {
    if (!pricingScrollWrapper || !pricingScrollTrack) return;

    const wrapperWidth = pricingScrollWrapper.offsetWidth;
    const trackWidth = pricingScrollTrack.scrollWidth;

    if (trackWidth > wrapperWidth) {
        const scrollAmount = (trackWidth - wrapperWidth) / 2;
        pricingScrollWrapper.scrollLeft = scrollAmount;
    }
}


// ============================================================
// أزرار التنقل العلوية
// ============================================================

function setupNavButtons() {
    const navProducts = document.getElementById('navProductsBtn');
    const navAbout = document.getElementById('navAboutBtn');
    const navPricing = document.getElementById('navPricingBtn');

    // تغيير نص زر عننا إلى "شعارنا"
    if (navAbout) {
        navAbout.textContent = 'شعارنا';
    }

    // زر قائمة الأسعار (في الجهة اليسرى)
    if (navPricing) {
        navPricing.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            navPricing.classList.add('active');

            if (heroGrid) {
                heroGrid.style.display = 'none';
            }
            if (pricingScrollContainer) {
                pricingScrollContainer.style.display = 'flex';
                loadPricingImages();
            }

            setLogoPosition('right');
        });
    }

    // زر شعارنا (في المنتصف) - عرض الصورة مع تأثير ظهور تدريجي
    if (navAbout) {
        navAbout.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            navAbout.classList.add('active');

            if (heroGrid) {
                heroGrid.style.display = 'flex';
                heroGrid.style.flexDirection = 'column';
                heroGrid.style.justifyContent = 'center';
                heroGrid.style.alignItems = 'center';
                heroGrid.style.minHeight = '70vh';
                heroGrid.style.width = '100%';
                heroGrid.style.padding = '20px';
                heroGrid.innerHTML = `
                    <div style="
                        width: 100%;
                        max-width: 900px;
                        height: 70vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    ">
                        <img src="abute us.png" alt="شعار معمل حاتم المصري" style="
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            opacity: 0;
                            transition: opacity 1.5s ease-in-out;
                        " id="aboutLogoImage">
                    </div>
                `;

                // بعد 2 ثانية، تبدأ الصورة في الظهور التدريجي
                setTimeout(() => {
                    const img = document.getElementById('aboutLogoImage');
                    if (img) {
                        img.style.opacity = '1';
                    }
                }, 2000);
            }
            if (pricingScrollContainer) {
                pricingScrollContainer.style.display = 'none';
            }

            setLogoPosition('center');
        });
    }

    // زر منتجاتنا (في الجهة اليمنى)
    if (navProducts) {
        navProducts.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            navProducts.classList.add('active');

            if (heroGrid) {
                heroGrid.style.display = 'grid';
                heroGrid.style.minHeight = 'auto';
                heroGrid.style.flexDirection = 'row';
                heroGrid.style.justifyContent = 'normal';
                heroGrid.style.alignItems = 'normal';
                heroGrid.style.padding = '0';
                loadHeroImages();
            }
            if (pricingScrollContainer) {
                pricingScrollContainer.style.display = 'none';
            }

            setLogoPosition('left');
        });
    }

    // تفعيل زر منتجاتنا افتراضياً
    if (navProducts) {
        navProducts.classList.add('active');
    }
}


// ============================================================
// OPEN PROJECT
// ============================================================

function openProject(
    projectId,
    cover,
    name
) {

    const project =
        LOCAL_PROJECTS.find(
            item =>
                item.id === projectId
        );


    if (!project) {

        console.error(
            'Project not found:',
            projectId
        );

        return;

    }


    currentProjectId =
        projectId;


    currentProjectData = {

        photoURL:
            cover,

        name:
            name,

        images:
            project.images || []

    };


    if (projectModalTitle) {

        projectModalTitle.textContent =
            name;

    }


    if (projectModalBody) {

        projectModalBody.innerHTML =
            '<div class="loading-state"><div class="spinner"></div></div>';

    }


    showOverlay(projectModal);


    refreshProjectBody();

}


// ============================================================
// BUILD PROJECT BODY
// ============================================================

function refreshProjectBody() {

    if (!projectModalBody) {

        return;

    }


    const images =
        currentProjectData.images || [];


    const body =
        document.createElement('div');


    body.className =
        'proj-body-inner';


    // ========================================================
    // COVER
    // ========================================================

    const cover =
        document.createElement('div');


    cover.className =
        'proj-cover';


    const coverImage =
        document.createElement('img');


    coverImage.src =
        currentProjectData.photoURL;


    coverImage.alt =
        currentProjectData.name;


    coverImage.onerror =
        function () {

            console.error(
                'Cover image not found:',
                this.src
            );


            cover.style.display =
                'none';

        };


    cover.appendChild(
        coverImage
    );


    body.appendChild(
        cover
    );


    // ========================================================
    // VIEWER IMAGES
    // ========================================================

    viewerImages =
        images.map(
            url => ({
                url: url,
                desc: ''
            })
        );


    // ========================================================
    // NO CONTENT
    // ========================================================

    if (!images.length) {

        const empty =
            document.createElement('div');


        empty.className =
            'empty-hint';


        empty.innerHTML = `

            <i class="fas fa-images"></i>

            <p>
                لا توجد محتويات إضافية لهذا المشروع
            </p>

        `;


        body.appendChild(
            empty
        );

    }


    // ========================================================
    // CONTENT GRID
    // ========================================================

    else {

        const grid =
            document.createElement('div');


        grid.className =
            'media-grid';


        images.forEach(
            (url, index) => {

                const card =
                    document.createElement('div');


                card.className =
                    'media-card';


                const image =
                    document.createElement('img');


                image.src =
                    url;


                image.alt =
                    currentProjectData.name;


                image.className =
                    'mc-img';


                image.onerror =
                    function () {

                        console.error(
                            'Content image not found:',
                            this.src
                        );


                        card.style.display =
                            'none';

                    };


                image.addEventListener(
                    'click',
                    () => {

                        openViewer(
                            'image',
                            index,
                            ''
                        );

                    }
                );


                card.appendChild(
                    image
                );


                grid.appendChild(
                    card
                );

            }
        );


        body.appendChild(
            grid
        );

    }


    projectModalBody.innerHTML =
        '';


    projectModalBody.appendChild(
        body
    );

}


// ============================================================
// IMAGE VIEWER
// ============================================================

window.openViewer =
function (
    type,
    urlOrIndex,
    desc
) {

    const existing =
        document.getElementById(
            'viewerOverlay'
        );


    if (existing) {

        existing.remove();

    }


    if (type !== 'image') {

        return;

    }


    viewerIndex =
        Number(urlOrIndex);


    viewerZoom =
        1;


    viewerOffset = {

        x: 0,

        y: 0

    };


    _buildImageViewer();

};


// ============================================================
// BUILD IMAGE VIEWER
// ============================================================

function _buildImageViewer() {

    const existing =
        document.getElementById(
            'viewerOverlay'
        );


    if (existing) {

        existing.remove();

    }


    const item =
        viewerImages[
            viewerIndex
        ];


    if (!item) {

        return;

    }


    const total =
        viewerImages.length;


    const overlay =
        document.createElement('div');


    overlay.id =
        'viewerOverlay';


    overlay.className =
        'viewer-overlay';


    overlay.innerHTML = `

        <div class="viewer-box viewer-box--img">

            <button
                class="viewer-close"
                id="viewerClose">

                <i class="fas fa-times"></i>

            </button>


            <div class="viewer-top-bar">

                <span class="viewer-counter">

                    ${viewerIndex + 1}

                    /

                    ${total}

                </span>


                <div class="viewer-zoom-btns">

                    <button
                        class="vzoom-btn"
                        id="vzoomIn"
                        title="تكبير">

                        <i class="fas fa-search-plus"></i>

                    </button>


                    <button
                        class="vzoom-btn"
                        id="vzoomOut"
                        title="تصغير">

                        <i class="fas fa-search-minus"></i>

                    </button>


                    <button
                        class="vzoom-btn"
                        id="vzoomReset"
                        title="إعادة ضبط">

                        <i class="fas fa-compress"></i>

                    </button>

                </div>


                <a
                    href="${item.url}"
                    target="_blank"
                    class="viewer-open-btn"
                    title="فتح في نافذة جديدة">

                    <i class="fas fa-external-link-alt"></i>

                </a>

            </div>


            <div
                class="viewer-img-area"
                id="viewerImgArea">

                <img
                    src="${item.url}"
                    class="viewer-img"
                    id="viewerImg"
                    draggable="false"
                >

            </div>


            ${
                total > 1
                ?
                `

                <button
                    class="viewer-nav viewer-prev"
                    id="viewerPrev">

                    <i class="fas fa-chevron-right"></i>

                </button>


                <button
                    class="viewer-nav viewer-next"
                    id="viewerNext">

                    <i class="fas fa-chevron-left"></i>

                </button>

                `
                :
                ''
            }

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    _applyZoom();


    // ========================================================
    // CLOSE - فقط عند الضغط على زر الإكس
    // ========================================================

    document
        .getElementById('viewerClose')
        .addEventListener(
            'click',
            (e) => {
                e.stopPropagation();
                _cleanupViewer();
                overlay.remove();
            }
        );


    // ========================================================
    // منع إغلاق النافذة عند الضغط على الصورة أو الخلفية
    // ========================================================

    overlay.addEventListener(
        'click',
        (e) => {
            e.stopPropagation();
        }
    );


    // ========================================================
    // NAVIGATION
    // ========================================================

    const previousButton =
        document.getElementById(
            'viewerPrev'
        );


    const nextButton =
        document.getElementById(
            'viewerNext'
        );


    if (previousButton) {

        previousButton.addEventListener(
            'click',
            (e) => {
                e.stopPropagation();
                _navigateViewer(
                    -1
                );
            }
        );

    }


    if (nextButton) {

        nextButton.addEventListener(
            'click',
            (e) => {
                e.stopPropagation();
                _navigateViewer(
                    1
                );
            }
        );

    }


    // ========================================================
    // ZOOM BUTTONS
    // ========================================================

    document
        .getElementById('vzoomIn')
        .addEventListener(
            'click',
            (e) => {
                e.stopPropagation();
                _changeZoom(
                    0.2
                );
            }
        );


    document
        .getElementById('vzoomOut')
        .addEventListener(
            'click',
            (e) => {
                e.stopPropagation();
                _changeZoom(
                    -0.2
                );
            }
        );


    document
        .getElementById('vzoomReset')
        .addEventListener(
            'click',
            (e) => {
                e.stopPropagation();
                viewerZoom =
                    1;


                viewerOffset = {

                    x: 0,

                    y: 0

                };


                _applyZoom();

            }
        );


    // ========================================================
    // MOUSE WHEEL
    // ========================================================

    const imageArea =
        document.getElementById(
            'viewerImgArea'
        );


    imageArea.addEventListener(
        'wheel',
        (e) => {
            e.stopPropagation();
            e.preventDefault();


            _changeZoom(

                e.deltaY < 0

                    ? 0.15

                    : -0.15

            );

        },
        {
            passive: false
        }
    );


    // ========================================================
    // DRAG - السحب على الصورة عند التكبير
    // ========================================================

    const image =
        document.getElementById(
            'viewerImg'
        );

    // بدء السحب
    image.addEventListener(
        'mousedown',
        (e) => {
            e.stopPropagation();

            if (
                viewerZoom <= 1
            ) {

                return;

            }


            viewerDragging =
                true;


            viewerDragStart = {

                x:
                    e.clientX -
                    viewerOffset.x,

                y:
                    e.clientY -
                    viewerOffset.y

            };


            image.style.cursor =
                'grabbing';


            e.preventDefault();

        }
    );


    // حركة السحب على مستوى النافذة
    window.addEventListener(
        'mousemove',
        _onDragMove
    );


    window.addEventListener(
        'mouseup',
        _onDragEnd
    );


    // ========================================================
    // منع نقل الصورة أو فتحها في تبويب جديد
    // ========================================================

    image.addEventListener(
        'dragstart',
        (e) => {
            e.preventDefault();
        }
    );


    // ========================================================
    // TOUCH / PINCH
    // ========================================================

    let lastPinchDistance =
        null;


    imageArea.addEventListener(
        'touchstart',
        (e) => {
            e.stopPropagation();

            if (
                e.touches.length === 2
            ) {

                lastPinchDistance =
                    Math.hypot(

                        e.touches[0].clientX -
                        e.touches[1].clientX,

                        e.touches[0].clientY -
                        e.touches[1].clientY

                    );

            }


            else if (
                e.touches.length === 1 &&
                viewerZoom > 1
            ) {

                viewerDragging =
                    true;


                viewerDragStart = {

                    x:
                        e.touches[0].clientX -
                        viewerOffset.x,

                    y:
                        e.touches[0].clientY -
                        viewerOffset.y

                };

            }

        },
        {
            passive: true
        }
    );


    imageArea.addEventListener(
        'touchmove',
        (e) => {
            e.stopPropagation();

            if (
                e.touches.length === 2 &&
                lastPinchDistance !== null
            ) {

                e.preventDefault();


                const distance =
                    Math.hypot(

                        e.touches[0].clientX -
                        e.touches[1].clientX,

                        e.touches[0].clientY -
                        e.touches[1].clientY

                    );


                _changeZoom(

                    (
                        distance -
                        lastPinchDistance
                    ) * 0.005

                );


                lastPinchDistance =
                    distance;

            }


            else if (
                e.touches.length === 1 &&
                viewerDragging
            ) {

                viewerOffset.x =
                    e.touches[0].clientX -
                    viewerDragStart.x;


                viewerOffset.y =
                    e.touches[0].clientY -
                    viewerDragStart.y;


                _applyZoom();

            }

        },
        {
            passive: false
        }
    );


    imageArea.addEventListener(
        'touchend',
        (e) => {
            e.stopPropagation();

            viewerDragging =
                false;


            lastPinchDistance =
                null;

        }
    );


    // ========================================================
    // KEYBOARD
    // ========================================================

    overlay._keyHandler =
        (e) => {
            e.stopPropagation();

            if (
                e.key === 'ArrowRight'
            ) {

                _navigateViewer(
                    -1
                );

            }


            if (
                e.key === 'ArrowLeft'
            ) {

                _navigateViewer(
                    1
                );

            }


            if (
                e.key === 'Escape'
            ) {

                _cleanupViewer();

                overlay.remove();

            }


            if (
                e.key === '+'
            ) {

                _changeZoom(
                    0.2
                );

            }


            if (
                e.key === '-'
            ) {

                _changeZoom(
                    -0.2
                );

            }

        };


    document.addEventListener(
        'keydown',
        overlay._keyHandler
    );

}


// ============================================================
// DRAG
// ============================================================

function _onDragMove(e) {

    if (!viewerDragging) {

        return;

    }


    viewerOffset.x =
        e.clientX -
        viewerDragStart.x;


    viewerOffset.y =
        e.clientY -
        viewerDragStart.y;


    _applyZoom();

}


function _onDragEnd() {

    viewerDragging =
        false;


    const image =
        document.getElementById(
            'viewerImg'
        );


    if (image) {

        image.style.cursor =
            viewerZoom > 1
                ? 'grab'
                : 'default';

    }

}


// ============================================================
// ZOOM
// ============================================================

function _applyZoom() {

    const image =
        document.getElementById(
            'viewerImg'
        );


    if (!image) {

        return;

    }


    if (
        viewerZoom <= 1
    ) {

        viewerOffset = {

            x: 0,

            y: 0

        };

    }


    image.style.transform =

        `translate(
            ${viewerOffset.x}px,
            ${viewerOffset.y}px
        )
        scale(${viewerZoom})`;


    image.style.cursor =
        viewerZoom > 1
            ? 'grab'
            : 'default';

}


function _changeZoom(
    delta
) {

    viewerZoom =
        Math.min(

            5,

            Math.max(

                0.5,

                viewerZoom + delta

            )

        );


    _applyZoom();

}


// ============================================================
// NAVIGATE VIEWER
// ============================================================

function _navigateViewer(
    direction
) {

    const total =
        viewerImages.length;


    if (!total) {

        return;

    }


    viewerIndex =

        (
            viewerIndex +
            direction +
            total

        ) % total;


    viewerZoom =
        1;


    viewerOffset = {

        x: 0,

        y: 0

    };


    _cleanupViewer();


    _buildImageViewer();

}


// ============================================================
// CLOSE VIEWER
// ============================================================

function _resetAndClose(
    overlay
) {

    _cleanupViewer();

    overlay.remove();

}


function _cleanupViewer() {

    window.removeEventListener(
        'mousemove',
        _onDragMove
    );


    window.removeEventListener(
        'mouseup',
        _onDragEnd
    );


    const overlay =
        document.getElementById(
            'viewerOverlay'
        );


    if (
        overlay &&
        overlay._keyHandler
    ) {

        document.removeEventListener(
            'keydown',
            overlay._keyHandler
        );

    }

}


// ============================================================
// PROJECT MODAL
// ============================================================

function setupProjectToolbar() {

    const closeButton =
        document.getElementById(
            'closeProjectModal'
        );


    if (closeButton) {

        closeButton.addEventListener(
            'click',
            () => {

                hideOverlay(
                    projectModal
                );

            }
        );

    }


    if (projectModal) {

        projectModal.addEventListener(
            'click',
            e => {

                if (
                    e.target === projectModal
                ) {

                    hideOverlay(
                        projectModal
                    );

                }

            }
        );

    }

}


// ============================================================
// INIT
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        setupMusic();

        setupProjectToolbar();

        // الوضع الافتراضي - منتجاتنا (الشعار في اليسار)
        setLogoPosition('left');
        loadHeroImages();
        setupNavButtons();

        // إخفاء السكرول في البداية
        if (pricingScrollContainer) {
            pricingScrollContainer.style.display = 'none';
        }

        // إعادة توسيط السكرول عند تغيير حجم النافذة
        window.addEventListener('resize', () => {
            if (pricingScrollContainer.style.display !== 'none') {
                centerPricingScroll();
            }
        });
    }
);
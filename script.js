// ============================================================
// SUPABASE CONFIG
// ============================================================

const SUPABASE_URL =
    'https://onmrexiyhzyytmfwbvsr.supabase.co';

const SUPABASE_ANON_KEY =
    'sb_publishable_kFcJ3JeFtjagz0aa-r2WRA_hUUOT8uU';

const SUPABASE_BUCKET =
    'dental-lab-portfolio';

const SUPABASE_HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};


// ============================================================
// STORAGE PATHS
// ============================================================

const PORTFOLIO_ROOT = 'portfolio';
const PRICING_ROOT = 'pricing';
const GENERAL_PHOTOS_ROOT = 'General photos';
const ABOUT_IMAGE_PATH = `${GENERAL_PHOTOS_ROOT}/abute us.png`;
const LAB_LOGO_PATH = `${GENERAL_PHOTOS_ROOT}/H EL M.png`;
const AUDIO_PATH = 'audio/background-music.mp3';


// ============================================================
// CACHE / STATE
// ============================================================

let projectsData = [];
let pricingData = [];

let projectsLoaded = false;
let pricingLoaded = false;

let currentProjectId = null;
let currentProjectData = null;

let currentLogoPosition = 'left';
let isMusicPlaying = false;


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

let viewerInitialized = false;


// ============================================================
// DOM REFERENCES
// ============================================================

const heroGrid =
    document.getElementById(
        'heroGrid'
    );

const pricingScrollContainer =
    document.getElementById(
        'pricingScrollContainer'
    );

const pricingScrollTrack =
    document.getElementById(
        'pricingScrollTrack'
    );

const pricingScrollWrapper =
    document.getElementById(
        'pricingScrollWrapper'
    );

const projectModal =
    document.getElementById(
        'projectModal'
    );

const projectModalBody =
    document.getElementById(
        'projectModalBody'
    );

const projectModalTitle =
    document.getElementById(
        'projectModalTitle'
    );

const labLogo =
    document.getElementById(
        'labLogo'
    );

const musicControl =
    document.getElementById(
        'musicControl'
    );

const backgroundMusic =
    document.getElementById(
        'backgroundMusic'
    );


// ============================================================
// GENERAL HELPERS
// ============================================================

function showOverlay(element) {

    if (!element) {
        return;
    }

    element.style.display = 'flex';
}


function hideOverlay(element) {

    if (!element) {
        return;
    }

    element.style.display = 'none';
}


function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function encodePath(path) {

    return String(path || '')
        .split('/')
        .map(
            part =>
                encodeURIComponent(part)
        )
        .join('/');
}


function storageUrl(path) {

    if (!path) {
        return '';
    }


    if (
        /^https?:\/\//i.test(path)
    ) {

        return path;

    }


    return (
        `${SUPABASE_URL}` +
        `/storage/v1/object/public/` +
        `${SUPABASE_BUCKET}/` +
        encodePath(path)
    );
}


function extensionOf(name) {

    const match =
        String(name || '')
            .toLowerCase()
            .match(
                /\.([a-z0-9]+)$/
            );


    return match
        ? match[1]
        : '';
}


function mediaTypeFromName(name) {

    const ext =
        extensionOf(name);


    if (
        [
            'jpg',
            'jpeg',
            'png',
            'webp',
            'gif',
            'bmp',
            'avif',
            'svg'
        ].includes(ext)
    ) {

        return 'image';

    }


    if (
        [
            'mp4',
            'webm',
            'ogg',
            'mov',
            'm4v',
            'avi'
        ].includes(ext)
    ) {

        return 'video';

    }


    if (
        ext === 'pdf'
    ) {

        return 'pdf';

    }


    if (
        [
            'mp3',
            'wav',
            'm4a',
            'aac',
            'flac'
        ].includes(ext)
    ) {

        return 'audio';

    }


    return 'file';
}


function isFolder(item) {

    return (
        item &&
        !item.id &&
        !item.metadata
    );
}


function sortItems(items) {

    return [...items].sort(
        (a, b) => {

            return String(
                a?.name || ''
            ).localeCompare(
                String(
                    b?.name || ''
                ),
                undefined,
                {
                    numeric: true,
                    sensitivity: 'base'
                }
            );

        }
    );
}


function displayName(name) {

    const value =
        String(name || '')
            .trim();


    if (!value) {
        return 'بدون اسم';
    }


    return value
        .replace(
            /[-_]+/g,
            ' '
        )
        .replace(
            /\s+/g,
            ' '
        )
        .trim();
}


function mediaDescription(filename) {

    if (!filename) {
        return '';
    }


    return String(filename)
        .replace(
            /\.[^/.]+$/,
            ''
        )
        .replace(
            /[-_]+/g,
            ' '
        )
        .replace(
            /\s+/g,
            ' '
        )
        .trim();
}


// ============================================================
// STORAGE
// ============================================================

async function listStorage(
    prefix = ''
) {

    const body = {

        prefix,

        limit: 1000,

        offset: 0,

        sortBy: {
            column: 'name',
            order: 'asc'
        }

    };


    const response =
        await fetch(
            `${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`,
            {
                method: 'POST',

                headers:
                    SUPABASE_HEADERS,

                body:
                    JSON.stringify(
                        body
                    )
            }
        );


    if (!response.ok) {

        const text =
            await response.text();

        throw new Error(
            `Supabase Storage ${response.status}: ${text}`
        );
    }


    const data =
        await response.json();


    return Array.isArray(data)
        ? data
        : [];
}


// ============================================================
// RECURSIVE STORAGE READER
// ============================================================

async function listAllFilesRecursively(
    prefix = ''
) {

    const result = [];

    const items =
        sortItems(
            await listStorage(
                prefix
            )
        );


    for (
        const item of items
    ) {

        const currentPath =
            prefix
                ? `${prefix}/${item.name}`
                : item.name;


        if (
            isFolder(item)
        ) {

            const nested =
                await listAllFilesRecursively(
                    currentPath
                );


            result.push(
                ...nested
            );

        }

        else {

            result.push({

                ...item,

                path:
                    currentPath,

                url:
                    storageUrl(
                        currentPath
                    ),

                type:
                    mediaTypeFromName(
                        item.name
                    )

            });

        }

    }


    return result;
}


// ============================================================
// PROJECT LOADER
// STRUCTURE:
//
// portfolio/
//   project-name/
//      cover/
//          cover.png
//      media/
//          image.jpg
//          another-image.png
// ============================================================

async function fetchProjectsFromStorage() {

    const rootItems =
        sortItems(
            await listStorage(
                PORTFOLIO_ROOT
            )
        );


    const projectFolders =
        rootItems.filter(
            item =>
                isFolder(item)
        );


    /*
     * نقرأ المشاريع بالتوازي.
     */

    const projects =
        await Promise.all(

            projectFolders.map(
                async (
                    folder,
                    index
                ) => {

                    const projectName =
                        folder.name;


                    const projectPath =
                        `${PORTFOLIO_ROOT}/${projectName}`;


                    /*
                     * نقرأ محتويات فولدر المشروع
                     */

                    const children =
                        await listStorage(
                            projectPath
                        );


                    /*
                     * COVER ثابت:
                     *
                     * project/cover/cover.png
                     */

                    const coverPath =
                        `${projectPath}/cover/cover.png`;


                    const coverUrl =
                        storageUrl(
                            coverPath
                        );


                    /*
                     * MEDIA FOLDER
                     */

                    const mediaFolder =
                        children.find(
                            item =>
                                isFolder(item) &&
                                String(
                                    item.name
                                )
                                    .toLowerCase()
                                    ===
                                    'media'
                        );


                    let media = [];


                    if (
                        mediaFolder
                    ) {

                        const mediaPath =
                            `${projectPath}/${mediaFolder.name}`;


                        const mediaFiles =
                            sortItems(
                                await listStorage(
                                    mediaPath
                                )
                            );


                        media =
                            mediaFiles
                                .filter(
                                    item =>
                                        !isFolder(item)
                                )
                                .map(
                                    item => {

                                        const fullPath =
                                            `${mediaPath}/${item.name}`;


                                        return {

                                            name:
                                                item.name,

                                            description:
                                                mediaDescription(
                                                    item.name
                                                ),

                                            path:
                                                fullPath,

                                            url:
                                                storageUrl(
                                                    fullPath
                                                ),

                                            type:
                                                mediaTypeFromName(
                                                    item.name
                                                )

                                        };

                                    }
                                );

                    }


                    return {

                        id:
                            projectPath,

                        name:
                            displayName(
                                projectName
                            ),

                        folderName:
                            projectName,

                        path:
                            projectPath,

                        order:
                            index,

                        cover:
                            coverUrl,

                        coverPath:
                            coverPath,

                        media:
                            media

                    };

                }
            )
        );


    return projects;
}


async function ensureProjectsLoaded() {

    if (
        projectsLoaded
    ) {

        return;

    }


    projectsData =
        await fetchProjectsFromStorage();


    projectsLoaded =
        true;
}


// ============================================================
// PROJECT CARDS
// ============================================================

function renderProjects() {

    if (!heroGrid) {
        return;
    }


    heroGrid.innerHTML =
        '';


    if (
        !projectsData.length
    ) {

        heroGrid.innerHTML = `

            <div
                class="empty-hint"
                style="grid-column:1/-1;"
            >

                <i
                    class="fas fa-images"
                ></i>

                <p>
                    لا توجد مشاريع لعرضها
                </p>

            </div>

        `;

        return;
    }


    const fragment =
        document.createDocumentFragment();


    projectsData.forEach(
        project => {

            const item =
                document.createElement(
                    'button'
                );


            item.type =
                'button';


            item.className =
                'hero-item';


            item.title =
                project.name;


            /*
             * Cover
             */

            if (
                project.cover
            ) {

                const image =
                    document.createElement(
                        'img'
                    );


                image.src =
                    project.cover;


                image.alt =
                    project.name;


                image.loading =
                    'lazy';


                image.decoding =
                    'async';


                item.appendChild(
                    image
                );

            }

            else {

                const placeholder =
                    document.createElement(
                        'div'
                    );


                placeholder.style.cssText = `
                    width:100%;
                    height:100%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:var(--blue-ll);
                    font-size:3rem;
                    background:var(--bg2);
                `;


                placeholder.innerHTML =
                    '<i class="fas fa-folder-open"></i>';


                item.appendChild(
                    placeholder
                );

            }


            /*
             * Name
             */

            const label =
                document.createElement(
                    'div'
                );


            label.className =
                'hero-label';


            label.textContent =
                project.name;


            item.appendChild(
                label
            );


            /*
             * Open
             */

            item.addEventListener(
                'click',
                () => {

                    openProject(
                        project.id
                    );

                }
            );


            fragment.appendChild(
                item
            );

        }
    );


    heroGrid.appendChild(
        fragment
    );
}


// ============================================================
// PROJECT MODAL
// ============================================================

function openProject(
    projectId
) {

    const project =
        projectsData.find(
            item =>
                item.id ===
                projectId
        );


    if (!project) {
        return;
    }


    currentProjectId =
        project.id;


    currentProjectData =
        project;


    if (
        projectModalTitle
    ) {

        projectModalTitle.textContent =
            project.name;

    }


    buildProjectBody(
        project
    );


    showOverlay(
        projectModal
    );
}


function buildProjectBody(
    project
) {

    if (
        !projectModalBody
    ) {
        return;
    }


    projectModalBody.innerHTML =
        '';


    const body =
        document.createElement(
            'div'
        );


    body.className =
        'proj-body-inner';


    /*
     * Cover
     */

    if (
        project.cover
    ) {

        const cover =
            document.createElement(
                'div'
            );


        cover.className =
            'proj-cover';


        const image =
            document.createElement(
                'img'
            );


        image.src =
            project.cover;


        image.alt =
            project.name;


        image.loading =
            'eager';


        image.decoding =
            'async';


        cover.appendChild(
            image
        );


        body.appendChild(
            cover
        );

    }


    /*
     * Media
     */

    const media =
        Array.isArray(
            project.media
        )
            ? project.media
            : [];


    const imageFiles =
        media.filter(
            item =>
                item.type ===
                'image'
        );


    /*
     * Prepare viewer data
     */

    viewerImages =
        imageFiles.map(
            item => ({

                url:
                    item.url,

                desc:
                    item.description,

                name:
                    item.name

            })
        );


    if (
        !media.length
    ) {

        const empty =
            document.createElement(
                'div'
            );


        empty.className =
            'empty-hint';


        empty.innerHTML = `

            <i
                class="fas fa-images"
            ></i>

            <p>
                لا توجد وسائط داخل هذا المشروع
            </p>

        `;


        body.appendChild(
            empty
        );

    }

    else {

        const grid =
            document.createElement(
                'div'
            );


        grid.className =
            'media-grid';


        media.forEach(
            mediaItem => {

                const card =
                    document.createElement(
                        'div'
                    );


                card.className =
                    'media-card';


                /*
                 * IMAGE
                 */

                if (
                    mediaItem.type ===
                    'image'
                ) {

                    const image =
                        document.createElement(
                            'img'
                        );


                    image.className =
                        'mc-img';


                    image.src =
                        mediaItem.url;


                    image.alt =
                        mediaItem.description ||
                        mediaItem.name;


                    image.title =
                        mediaItem.description ||
                        mediaItem.name;


                    image.loading =
                        'lazy';


                    image.decoding =
                        'async';


                    image.addEventListener(
                        'click',
                        event => {

                            event.preventDefault();


                            const index =
                                viewerImages.findIndex(
                                    viewerItem =>
                                        viewerItem.url ===
                                        mediaItem.url
                                );


                            if (
                                index >= 0
                            ) {

                                openViewer(
                                    index
                                );

                            }

                        }
                    );


                    card.appendChild(
                        image
                    );

                }


                /*
                 * VIDEO
                 */

                else if (
                    mediaItem.type ===
                    'video'
                ) {

                    const video =
                        document.createElement(
                            'video'
                        );


                    video.className =
                        'mc-video';


                    video.src =
                        mediaItem.url;


                    video.controls =
                        true;


                    video.preload =
                        'metadata';


                    video.playsInline =
                        true;


                    card.appendChild(
                        video
                    );

                }


                /*
                 * PDF / OTHER
                 */

                else {

                    const link =
                        document.createElement(
                            'a'
                        );


                    link.className =
                        'mc-icon';


                    link.href =
                        mediaItem.url;


                    link.target =
                        '_blank';


                    link.rel =
                        'noopener';


                    link.innerHTML =
                        mediaItem.type ===
                        'pdf'

                            ?

                        `
                            <i
                                class="fas fa-file-pdf"
                                style="
                                    color:#ef5350;
                                    font-size:2.5rem;
                                "
                            ></i>
                        `

                            :

                        `
                            <i
                                class="fas fa-file"
                            ></i>
                        `;


                    card.appendChild(
                        link
                    );

                }


                /*
                 * Description
                 */

                if (
                    mediaItem.description
                ) {

                    const info =
                        document.createElement(
                            'div'
                        );


                    info.className =
                        'mc-info';


                    const description =
                        document.createElement(
                            'span'
                        );


                    description.className =
                        'mc-desc';


                    description.textContent =
                        mediaItem.description;


                    info.appendChild(
                        description
                    );


                    card.appendChild(
                        info
                    );

                }


                grid.appendChild(
                    card
                );

            }
        );


        body.appendChild(
            grid
        );

    }


    projectModalBody.appendChild(
        body
    );
}


// ============================================================
// PROJECT MODAL CONTROLS
// ============================================================

function setupProjectToolbar() {

    const closeButton =
        document.getElementById(
            'closeProjectModal'
        );


    if (
        closeButton
    ) {

        closeButton.addEventListener(
            'click',
            () => {

                hideOverlay(
                    projectModal
                );

            }
        );

    }


    if (
        projectModal
    ) {

        projectModal.addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    projectModal
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
// VIEWER - CREATE ONCE
// ============================================================

function ensureViewer() {

    let overlay =
        document.getElementById(
            'viewerOverlay'
        );


    if (
        overlay &&
        viewerInitialized
    ) {

        return overlay;
    }


    /*
     * Create
     */

    overlay =
        document.createElement(
            'div'
        );


    overlay.id =
        'viewerOverlay';


    overlay.className =
        'viewer-overlay';


    overlay.innerHTML = `

        <div
            class="viewer-box viewer-box--img"
            role="dialog"
            aria-modal="true"
        >

            <!-- CLOSE -->

            <button
                class="viewer-close"
                id="viewerClose"
                type="button"
                aria-label="إغلاق"
                title="إغلاق"
            >

                <i
                    class="fas fa-times"
                ></i>

            </button>


            <!-- TOP BAR -->

            <div
                class="viewer-top-bar"
            >

                <span
                    class="viewer-counter"
                    id="viewerCounter"
                >
                    1 / 1
                </span>


                <div
                    class="viewer-zoom-btns"
                >

                    <button
                        class="vzoom-btn"
                        id="vzoomIn"
                        type="button"
                        title="تكبير"
                    >

                        <i
                            class="fas fa-search-plus"
                        ></i>

                    </button>


                    <button
                        class="vzoom-btn"
                        id="vzoomOut"
                        type="button"
                        title="تصغير"
                    >

                        <i
                            class="fas fa-search-minus"
                        ></i>

                    </button>


                    <button
                        class="vzoom-btn"
                        id="vzoomReset"
                        type="button"
                        title="إعادة ضبط"
                    >

                        <i
                            class="fas fa-compress"
                        ></i>

                    </button>


                    <a
                        class="viewer-open-btn"
                        id="viewerOpen"
                        href="#"
                        target="_blank"
                        rel="noopener"
                        title="فتح الصورة"
                    >

                        <i
                            class="fas fa-external-link-alt"
                        ></i>

                    </a>

                </div>

            </div>


            <!-- IMAGE AREA -->

            <div
                class="viewer-img-area"
                id="viewerImgArea"
            >

                <img
                    class="viewer-img"
                    id="viewerImg"
                    src=""
                    alt=""
                    draggable="false"
                >

            </div>


            <!-- PREVIOUS -->

            <button
                class="viewer-nav viewer-prev"
                id="viewerPrev"
                type="button"
                aria-label="الصورة السابقة"
                title="الصورة السابقة"
            >

                <i
                    class="fas fa-chevron-right"
                ></i>

            </button>


            <!-- NEXT -->

            <button
                class="viewer-nav viewer-next"
                id="viewerNext"
                type="button"
                aria-label="الصورة التالية"
                title="الصورة التالية"
            >

                <i
                    class="fas fa-chevron-left"
                ></i>

            </button>


            <!-- DESCRIPTION -->

            <div
                class="viewer-description"
                id="viewerDescription"
            ></div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    viewerInitialized =
        true;


    bindViewerEvents(
        overlay
    );


    return overlay;
}


// ============================================================
// VIEWER EVENTS
// ============================================================

function bindViewerEvents(
    overlay
) {

    const closeButton =
        document.getElementById(
            'viewerClose'
        );


    const previousButton =
        document.getElementById(
            'viewerPrev'
        );


    const nextButton =
        document.getElementById(
            'viewerNext'
        );


    const zoomInButton =
        document.getElementById(
            'vzoomIn'
        );


    const zoomOutButton =
        document.getElementById(
            'vzoomOut'
        );


    const zoomResetButton =
        document.getElementById(
            'vzoomReset'
        );


    const viewerOpenButton =
        document.getElementById(
            'viewerOpen'
        );


    const imageArea =
        document.getElementById(
            'viewerImgArea'
        );


    const image =
        document.getElementById(
            'viewerImg'
        );


    /*
     * CLOSE
     */

    closeButton.onclick =
        event => {

            event.preventDefault();
            event.stopPropagation();

            closeViewer();

        };


    /*
     * PREVIOUS
     */

    previousButton.onclick =
        event => {

            event.preventDefault();
            event.stopPropagation();

            navigateViewer(
                -1
            );

        };


    /*
     * NEXT
     */

    nextButton.onclick =
        event => {

            event.preventDefault();
            event.stopPropagation();

            navigateViewer(
                1
            );

        };


    /*
     * ZOOM IN
     */

    zoomInButton.onclick =
        event => {

            event.preventDefault();
            event.stopPropagation();

            changeViewerZoom(
                0.2
            );

        };


    /*
     * ZOOM OUT
     */

    zoomOutButton.onclick =
        event => {

            event.preventDefault();
            event.stopPropagation();

            changeViewerZoom(
                -0.2
            );

        };


    /*
     * RESET
     */

    zoomResetButton.onclick =
        event => {

            event.preventDefault();
            event.stopPropagation();

            viewerZoom =
                1;


            viewerOffset = {
                x: 0,
                y: 0
            };


            applyViewerTransform();

        };


    /*
     * Open external
     */

    viewerOpenButton.onclick =
        event => {

            event.stopPropagation();

        };


    /*
     * Mouse wheel
     */

    imageArea.addEventListener(
        'wheel',
        event => {

            event.preventDefault();

            changeViewerZoom(
                event.deltaY < 0
                    ? 0.15
                    : -0.15
            );

        },
        {
            passive: false
        }
    );


    /*
     * Drag
     */

    image.addEventListener(
        'mousedown',
        event => {

            if (
                viewerZoom <= 1
            ) {

                return;

            }


            viewerDragging =
                true;


            viewerDragStart = {

                x:
                    event.clientX -
                    viewerOffset.x,

                y:
                    event.clientY -
                    viewerOffset.y

            };


            image.style.cursor =
                'grabbing';


            event.preventDefault();

        }
    );


    document.addEventListener(
        'mousemove',
        viewerMouseMove
    );


    document.addEventListener(
        'mouseup',
        viewerMouseUp
    );


    /*
     * Touch
     */

    let pinchDistance = null;


    imageArea.addEventListener(
        'touchstart',
        event => {

            if (
                event.touches.length ===
                2
            ) {

                pinchDistance =
                    Math.hypot(
                        event.touches[0].clientX -
                        event.touches[1].clientX,

                        event.touches[0].clientY -
                        event.touches[1].clientY
                    );

            }


            else if (
                event.touches.length ===
                    1 &&
                viewerZoom > 1
            ) {

                viewerDragging =
                    true;


                viewerDragStart = {

                    x:
                        event.touches[0].clientX -
                        viewerOffset.x,

                    y:
                        event.touches[0].clientY -
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
        event => {

            if (
                event.touches.length ===
                    2 &&
                pinchDistance !== null
            ) {

                event.preventDefault();


                const distance =
                    Math.hypot(
                        event.touches[0].clientX -
                        event.touches[1].clientX,

                        event.touches[0].clientY -
                        event.touches[1].clientY
                    );


                changeViewerZoom(
                    (
                        distance -
                        pinchDistance
                    ) * 0.005
                );


                pinchDistance =
                    distance;

            }


            else if (
                event.touches.length ===
                    1 &&
                viewerDragging
            ) {

                viewerOffset.x =
                    event.touches[0].clientX -
                    viewerDragStart.x;


                viewerOffset.y =
                    event.touches[0].clientY -
                    viewerDragStart.y;


                applyViewerTransform();

            }

        },
        {
            passive: false
        }
    );


    imageArea.addEventListener(
        'touchend',
        () => {

            viewerDragging =
                false;

            pinchDistance =
                null;

        }
    );


    /*
     * Keyboard
     */

    document.addEventListener(
        'keydown',
        event => {

            const currentViewer =
                document.getElementById(
                    'viewerOverlay'
                );


            if (
                !currentViewer ||
                currentViewer.style.display ===
                    'none'
            ) {

                return;

            }


            if (
                event.key ===
                'Escape'
            ) {

                closeViewer();

            }


            else if (
                event.key ===
                'ArrowRight'
            ) {

                navigateViewer(
                    -1
                );

            }


            else if (
                event.key ===
                'ArrowLeft'
            ) {

                navigateViewer(
                    1
                );

            }


            else if (
                event.key ===
                '+'
            ) {

                changeViewerZoom(
                    0.2
                );

            }


            else if (
                event.key ===
                '-'
            ) {

                changeViewerZoom(
                    -0.2
                );

            }

        }
    );


    /*
     * Prevent viewer content from closing it.
     */

    const viewerBox =
        overlay.querySelector(
            '.viewer-box'
        );


    viewerBox.addEventListener(
        'click',
        event => {

            event.stopPropagation();

        }
    );

}


// ============================================================
// SHOW VIEWER
// ============================================================

function openViewer(
    index
) {

    if (
        !viewerImages.length
    ) {

        return;

    }


    const overlay =
        ensureViewer();


    viewerIndex =
        Math.max(
            0,
            Math.min(
                Number(index) || 0,
                viewerImages.length - 1
            )
        );


    viewerZoom =
        1;


    viewerOffset = {
        x: 0,
        y: 0
    };


    updateViewer();


    overlay.style.display =
        'flex';


    overlay.setAttribute(
        'aria-hidden',
        'false'
    );


    document.body.style.overflow =
        'hidden';

}


// ============================================================
// UPDATE VIEWER WITHOUT REBUILDING IT
// ============================================================

function updateViewer() {

    const item =
        viewerImages[
            viewerIndex
        ];


    if (!item) {
        return;
    }


    const overlay =
        ensureViewer();


    const image =
        document.getElementById(
            'viewerImg'
        );


    const counter =
        document.getElementById(
            'viewerCounter'
        );


    const description =
        document.getElementById(
            'viewerDescription'
        );


    const openButton =
        document.getElementById(
            'viewerOpen'
        );


    const previousButton =
        document.getElementById(
            'viewerPrev'
        );


    const nextButton =
        document.getElementById(
            'viewerNext'
        );


    if (
        image
    ) {

        image.src =
            item.url;

        image.alt =
            item.desc ||
            item.name ||
            '';

        image.title =
            item.desc ||
            item.name ||
            '';

    }


    if (
        counter
    ) {

        counter.textContent =
            `${viewerIndex + 1} / ${viewerImages.length}`;

    }


    if (
        description
    ) {

        description.textContent =
            item.desc ||
            item.name ||
            '';

    }


    if (
        openButton
    ) {

        openButton.href =
            item.url;

    }


    const hasMultiple =
        viewerImages.length >
        1;


    if (
        previousButton
    ) {

        previousButton.style.display =
            hasMultiple
                ? 'flex'
                : 'none';

    }


    if (
        nextButton
    ) {

        nextButton.style.display =
            hasMultiple
                ? 'flex'
                : 'none';

    }


    viewerZoom =
        1;


    viewerOffset = {
        x: 0,
        y: 0
    };


    applyViewerTransform();


    if (
        overlay.style.display !==
        'flex'
    ) {

        overlay.style.display =
            'flex';

    }

}


// ============================================================
// PREVIOUS / NEXT
// ============================================================

function navigateViewer(
    direction
) {

    if (
        viewerImages.length <=
        1
    ) {

        return;

    }


    viewerIndex =
        (
            viewerIndex +
            direction +
            viewerImages.length
        ) %
        viewerImages.length;


    updateViewer();

}


// ============================================================
// CLOSE VIEWER
// ============================================================

function closeViewer() {

    const overlay =
        document.getElementById(
            'viewerOverlay'
        );


    if (
        !overlay
    ) {

        return;

    }


    overlay.style.display =
        'none';


    overlay.setAttribute(
        'aria-hidden',
        'true'
    );


    document.body.style.overflow =
        '';

}


// ============================================================
// VIEWER ZOOM
// ============================================================

function changeViewerZoom(
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


    applyViewerTransform();

}


function applyViewerTransform() {

    const image =
        document.getElementById(
            'viewerImg'
        );


    if (
        !image
    ) {

        return;

    }


    if (
        viewerZoom <=
        1
    ) {

        viewerOffset = {
            x: 0,
            y: 0
        };

    }


    image.style.transform =
        `
        translate(
            ${viewerOffset.x}px,
            ${viewerOffset.y}px
        )
        scale(
            ${viewerZoom}
        )
        `;


    image.style.cursor =
        viewerZoom > 1
            ? 'grab'
            : 'default';

}


// ============================================================
// VIEWER DRAG
// ============================================================

function viewerMouseMove(
    event
) {

    if (
        !viewerDragging
    ) {

        return;

    }


    const overlay =
        document.getElementById(
            'viewerOverlay'
        );


    if (
        !overlay ||
        overlay.style.display !==
            'flex'
    ) {

        return;

    }


    viewerOffset.x =
        event.clientX -
        viewerDragStart.x;


    viewerOffset.y =
        event.clientY -
        viewerDragStart.y;


    applyViewerTransform();

}


function viewerMouseUp() {

    viewerDragging =
        false;


    const image =
        document.getElementById(
            'viewerImg'
        );


    if (
        image
    ) {

        image.style.cursor =
            viewerZoom > 1
                ? 'grab'
                : 'default';

    }

}


// ============================================================
// PRICING
// ============================================================

async function fetchPricingFromStorage() {

    const files =
        await listAllFilesRecursively(
            PRICING_ROOT
        );


    return files.filter(
        file =>
            file.type ===
            'image'
    );
}


async function ensurePricingLoaded() {

    if (
        pricingLoaded
    ) {

        return;

    }


    pricingData =
        await fetchPricingFromStorage();


    pricingLoaded =
        true;
}


function renderPricing() {

    if (
        !pricingScrollTrack
    ) {

        return;

    }


    pricingScrollTrack.innerHTML =
        '';


    if (
        !pricingData.length
    ) {

        pricingScrollTrack.innerHTML = `

            <div
                class="empty-hint"
            >

                <i
                    class="fas fa-images"
                ></i>

                <p>
                    لا توجد قائمة أسعار
                </p>

            </div>

        `;

        return;
    }


    const fragment =
        document.createDocumentFragment();


    pricingData.forEach(
        item => {

            const wrapper =
                document.createElement(
                    'div'
                );


            wrapper.className =
                'pricing-page-image';


            const image =
                document.createElement(
                    'img'
                );


            image.src =
                item.url;

            image.alt =
                mediaDescription(
                    item.name
                );

            image.loading =
                'lazy';

            image.decoding =
                'async';


            wrapper.appendChild(
                image
            );


            fragment.appendChild(
                wrapper
            );

        }
    );


    pricingScrollTrack.appendChild(
        fragment
    );
}


function showPricing() {

    if (
        heroGrid
    ) {

        heroGrid.style.display =
            'none';

    }


    if (
        pricingScrollContainer
    ) {

        pricingScrollContainer.style.display =
            'flex';

    }


    if (
        pricingLoaded
    ) {

        renderPricing();

    }


    setLogoPosition(
        'right'
    );
}


async function showPricingAndLoad() {

    if (
        heroGrid
    ) {

        heroGrid.style.display =
            'none';

    }


    if (
        pricingScrollContainer
    ) {

        pricingScrollContainer.style.display =
            'flex';

    }


    try {

        await ensurePricingLoaded();

        renderPricing();

    }
    catch (error) {

        console.error(
            'Pricing load failed:',
            error
        );


        if (
            pricingScrollTrack
        ) {

            pricingScrollTrack.innerHTML = `

                <div
                    class="empty-hint"
                >

                    <i
                        class="fas fa-triangle-exclamation"
                    ></i>

                    <p>
                        تعذر تحميل قائمة الأسعار
                    </p>

                </div>

            `;

        }

    }


    setLogoPosition(
        'right'
    );
}


// ============================================================
// ABOUT
// ============================================================

function showAbout() {

    const button =
        document.getElementById(
            'navAboutBtn'
        );


    activateNav(
        button
    );


    if (
        heroGrid
    ) {

        heroGrid.style.display =
            'flex';


        heroGrid.style.flexDirection =
            'column';


        heroGrid.style.justifyContent =
            'center';


        heroGrid.style.alignItems =
            'center';


        heroGrid.style.minHeight =
            '70vh';


        heroGrid.style.width =
            '100%';


        heroGrid.style.padding =
            '20px';


        heroGrid.innerHTML = `

            <div
                class="about-image-container"
            >

                <img
                    src="${storageUrl(ABOUT_IMAGE_PATH)}"
                    alt="شعار معمل حاتم المصري"
                    id="aboutLogoImage"
                >

            </div>

        `;


        /*
         * تبدأ الأنيميشن بعد ثانيتين.
         */

        setTimeout(
            () => {

                const image =
                    document.getElementById(
                        'aboutLogoImage'
                    );


                if (
                    image
                ) {

                    image.classList.add(
                        'show'
                    );

                }

            },
            2000
        );

    }


    if (
        pricingScrollContainer
    ) {

        pricingScrollContainer.style.display =
            'none';

    }


    setLogoPosition(
        'center'
    );
}


// ============================================================
// PRODUCTS
// ============================================================

function showProducts() {

    const button =
        document.getElementById(
            'navProductsBtn'
        );


    activateNav(
        button
    );


    if (
        pricingScrollContainer
    ) {

        pricingScrollContainer.style.display =
            'none';

    }


    if (
        heroGrid
    ) {

        heroGrid.style.display =
            'grid';


        heroGrid.style.flexDirection =
            '';

        heroGrid.style.justifyContent =
            '';

        heroGrid.style.alignItems =
            '';

        heroGrid.style.minHeight =
            '';

        heroGrid.style.width =
            '';

        heroGrid.style.padding =
            '';

    }


    /*
     * لا نقرأ Supabase مرة أخرى.
     */

    renderProjects();


    setLogoPosition(
        'left'
    );
}


// ============================================================
// NAV ACTIVATION
// ============================================================

function activateNav(
    activeButton
) {

    document
        .querySelectorAll(
            '.nav-btn'
        )
        .forEach(
            button =>
                button.classList.remove(
                    'active'
                )
        );


    if (
        activeButton
    ) {

        activeButton.classList.add(
            'active'
        );

    }
}


// ============================================================
// NAVIGATION SETUP
// ============================================================

function setupNavButtons() {

    const navProducts =
        document.getElementById(
            'navProductsBtn'
        );


    const navAbout =
        document.getElementById(
            'navAboutBtn'
        );


    const navPricing =
        document.getElementById(
            'navPricingBtn'
        );


    if (
        navAbout
    ) {

        navAbout.textContent =
            'شعارنا';

    }


    if (
        navProducts
    ) {

        navProducts.addEventListener(
            'click',
            showProducts
        );

    }


    if (
        navAbout
    ) {

        navAbout.addEventListener(
            'click',
            showAbout
        );

    }


    if (
        navPricing
    ) {

        navPricing.addEventListener(
            'click',
            showPricingAndLoad
        );

    }


    if (
        navProducts
    ) {

        navProducts.classList.add(
            'active'
        );

    }
}


// ============================================================
// LOGO POSITION
// ============================================================

function setLogoPosition(
    position
) {

    if (
        !labLogo
    ) {

        return;

    }


    labLogo.classList.remove(
        'position-left',
        'position-right',
        'position-center'
    );


    labLogo.classList.add(
        `position-${position}`
    );


    currentLogoPosition =
        position;
}


// ============================================================
// MUSIC
// ============================================================

function setupMusic() {

    if (
        !musicControl ||
        !backgroundMusic
    ) {

        return;

    }


    backgroundMusic.src =
        storageUrl(
            AUDIO_PATH
        );


    backgroundMusic.loop =
        true;


    backgroundMusic.preload =
        'auto';


    function updateButton() {

        musicControl.innerHTML =
            isMusicPlaying

                ? '<i class="fas fa-pause"></i>'

                : '<i class="fas fa-music"></i>';

    }


    async function tryPlay() {

        try {

            await backgroundMusic.play();

            isMusicPlaying =
                true;

            updateButton();

        }
        catch {

            isMusicPlaying =
                false;

            updateButton();

        }

    }


    musicControl.addEventListener(
        'click',
        async event => {

            event.stopPropagation();


            if (
                backgroundMusic.paused
            ) {

                await tryPlay();

            }

            else {

                backgroundMusic.pause();

            }

        }
    );


    backgroundMusic.addEventListener(
        'play',
        () => {

            isMusicPlaying =
                true;

            updateButton();

        }
    );


    backgroundMusic.addEventListener(
        'pause',
        () => {

            isMusicPlaying =
                false;

            updateButton();

        }
    );


    document.addEventListener(
        'pointerdown',
        () => {

            if (
                backgroundMusic.paused
            ) {

                tryPlay();

            }

        },
        {
            once: true,
            passive: true
        }
    );


    updateButton();

    tryPlay();
}


// ============================================================
// INIT
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        setupMusic();

        setupProjectToolbar();

        setupNavButtons();

        setLogoPosition(
            'left'
        );


        if (
            pricingScrollContainer
        ) {

            pricingScrollContainer.style.display =
                'none';

        }


        /*
         * قراءة المشاريع مرة واحدة.
         */

        try {

            await ensureProjectsLoaded();

            renderProjects();

        }

        catch (error) {

            console.error(
                'Initial projects load failed:',
                error
            );


            if (
                heroGrid
            ) {

                heroGrid.innerHTML = `

                    <div
                        class="empty-hint"
                        style="grid-column:1/-1;"
                    >

                        <i
                            class="fas fa-triangle-exclamation"
                        ></i>

                        <p>
                            تعذر تحميل المشاريع
                        </p>

                    </div>

                `;

            }

        }


        window.addEventListener(
            'resize',
            centerPricingScroll
        );

    }
);

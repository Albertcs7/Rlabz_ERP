import { API_BASE } from '@/core/config/api.js';
import { updateDesignSidebar } from '../layouts/DesignLayout.js';
import Swal from 'sweetalert2';
import '../design.css';

export async function DesignRequests(route, router) {
  setTimeout(updateDesignSidebar, 0);

  const container = document.createElement('div');
  container.className = 'design-module animate-fade-in';

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  let intakeStep = 1;
  let availableProjects = [];
  let availableBrandKits = [];

  const workTypeLabels = {
    poster: 'Poster / Static Graphic',
    social_creative: 'Social Media Creative',
    video_motion: 'Video / Reel / Motion Graphic',
    presentation: 'Presentation / Document',
    other: 'Other Work'
  };

  // Initial request brief form
  let initialForm = {
    work_type: 'poster',
    project_id: '',
    brand_kit_name: 'RLabZ Core Platform Brand Kit',
    title: '',
    purpose: '',
    requesting_person: storedUser.name || 'Staff / Student Requester',
    requesting_division: 'Teaching & Academics',
    target_audience: '',
    publishing_channel: '',
    required_by: '',
    priority: 'normal',
    final_copy: '',
    reference_links: '',
    requester_attachments: '',
    brand_constraints: '',
    type_specific_fields: {}
  };

  // Check if there was cloned brief in sessionStorage from Asset Library
  const storedClone = sessionStorage.getItem('rlabz_cloned_brief');
  if (storedClone) {
    try {
      const parsed = JSON.parse(storedClone);
      initialForm = { ...initialForm, ...parsed };
      intakeStep = 2; // Jump to details if cloned
      sessionStorage.removeItem('rlabz_cloned_brief');
    } catch (e) {}
  }

  let intakeForm = { ...initialForm };

  const toast = (title, icon = 'success') => {
    Swal.fire({
      title,
      icon,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  };

  // Load projects and permitted brand kits
  try {
    const res = await fetch(`${API_BASE}/design/brand-kit`, { headers });
    if (res.ok) {
      const data = await res.json();
      availableProjects = data.availableProjects || [];
      availableBrandKits = data.brandKits || [];
    }
  } catch (e) {
    console.error('Error fetching brand kits & projects:', e);
  }

  function render() {
    container.innerHTML = `
      <div style="max-width: 860px; width: 100%; margin: 0 auto; box-sizing: border-box; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 2.25rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="margin-bottom: 1.5rem; text-align: center;">
          <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 0.35rem 0; color: #0f172a;">Creative Request Intake Brief</h2>
          <p style="color: #64748b; font-size: 0.88rem; margin: 0;">Submit structured design deliverables for academic initiatives, events, or client projects.</p>
        </div>

        <!-- Step Indicators -->
        <div class="intake-steps-nav">
          <div class="intake-step-item ${intakeStep >= 1 ? 'active' : ''} ${intakeStep > 1 ? 'done' : ''}">
            <div class="step-circle">1</div>
            <span class="step-name">Choose Work Type</span>
          </div>
          <div class="intake-step-item ${intakeStep >= 2 ? 'active' : ''} ${intakeStep > 2 ? 'done' : ''}">
            <div class="step-circle">2</div>
            <span class="step-name">Common Details</span>
          </div>
          <div class="intake-step-item ${intakeStep >= 3 ? 'active' : ''}">
            <div class="step-circle">3</div>
            <span class="step-name">Type-Specific Brief</span>
          </div>
        </div>

        <!-- Step 1: Choose Work Type -->
        ${intakeStep === 1 ? `
          <div style="margin-bottom: 1.5rem; text-align: center;">
            <h3 style="font-size: 1.2rem; margin: 0 0 0.4rem 0;">Select What You Need Created</h3>
            <p style="color: #64748b; font-size: 0.88rem; margin: 0;">The brief form dynamically matches your creative deliverables.</p>
          </div>
          <div class="work-type-cards">
            <div class="work-type-card ${intakeForm.work_type === 'poster' ? 'selected' : ''}" data-type="poster">
              <div style="font-size: 1.7rem;">🖼️</div>
              <h4>Poster / Static Graphic</h4>
              <p>Print banners, symposium posters, standees, certificates &amp; billboards.</p>
            </div>
            <div class="work-type-card ${intakeForm.work_type === 'social_creative' ? 'selected' : ''}" data-type="social_creative">
              <div style="font-size: 1.7rem;">📱</div>
              <h4>Social Media Creative</h4>
              <p>Single feed posts, story graphics or swipeable carousel decks.</p>
            </div>
            <div class="work-type-card ${intakeForm.work_type === 'video_motion' ? 'selected' : ''}" data-type="video_motion">
              <div style="font-size: 1.7rem;">🎬</div>
              <h4>Video / Reel / Motion Graphic</h4>
              <p>Vertical reels, promotional trailers, motion logos &amp; intros.</p>
            </div>
            <div class="work-type-card ${intakeForm.work_type === 'presentation' ? 'selected' : ''}" data-type="presentation">
              <div style="font-size: 1.7rem;">📊</div>
              <h4>Presentation / Document</h4>
              <p>Pitch decks, executive advisory slides, formal reports &amp; booklets.</p>
            </div>
            <div class="work-type-card ${intakeForm.work_type === 'other' ? 'selected' : ''}" data-type="other">
              <div style="font-size: 1.7rem;">✨</div>
              <h4>Other Work</h4>
              <p>Custom 3D assets, event badges, merchandise, scoped directly by Lead.</p>
            </div>
          </div>
          <div style="margin-top: 2rem; display: flex; justify-content: flex-end;">
            <button class="design-btn design-btn-primary" id="btn-step-1-next">Continue to Step 2 →</button>
          </div>
        ` : ''}

        <!-- Step 2: Common Fields -->
        ${intakeStep === 2 ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1.25rem; margin: 0 0 0.4rem 0;">Step 2: Common Creative Brief</h3>
            <p style="color: #64748b; font-size: 0.88rem; margin: 0;">Core specifications and metadata required for production scheduling.</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Request Title & Purpose -->
            <div class="form-group">
              <label style="font-weight:700;">Request Title (Used as deliverable heading) <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
              <input type="text" id="intake-title" class="design-input" placeholder="e.g. National Cyber Symposium 2026 Keynote Poster" value="${intakeForm.title}">
              <small style="color: #64748b; font-size: 0.74rem;">This title will appear as the headline on ticket cards and the studio preview.</small>
            </div>

            <div class="form-group">
              <label style="font-weight:700;">Request Purpose / Objective (Optional)</label>
              <input type="text" id="intake-purpose" class="design-input" placeholder="e.g. Promote symposium registrations and spotlight guest speakers" value="${intakeForm.purpose || ''}">
            </div>

            <!-- Requester & Division -->
            <div class="form-grid-2">
              <div class="form-group">
                <label style="font-weight:700;">Requesting Person</label>
                <input type="text" id="intake-person" class="design-input" value="${intakeForm.requesting_person}" readonly style="background:#f8fafc; color:#475569;">
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Requesting Division <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <select id="intake-division" class="design-select">
                  <option value="Teaching & Academics" ${intakeForm.requesting_division === 'Teaching & Academics' ? 'selected' : ''}>Teaching &amp; Academics</option>
                  <option value="Training & Placement" ${intakeForm.requesting_division === 'Training & Placement' ? 'selected' : ''}>Training &amp; Placement</option>
                  <option value="Design & Branding" ${intakeForm.requesting_division === 'Design & Branding' ? 'selected' : ''}>Design &amp; Branding</option>
                  <option value="AI-Ops Division" ${intakeForm.requesting_division === 'AI-Ops Division' ? 'selected' : ''}>AI-Ops Division</option>
                </select>
              </div>
            </div>

            <!-- Brand Kit & Priority -->
            <div class="form-grid-2">
              <div class="form-group">
                <label style="font-weight:700;">Applicable Brand Kit <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <select id="intake-brand-kit" class="design-select">
                  ${availableBrandKits.length === 0 ? `
                    <option value="RLabZ Core Platform Brand Kit">RLabZ Core Platform Brand Kit</option>
                  ` : availableBrandKits.map(bk => `
                    <option value="${bk.name}" ${intakeForm.brand_kit_name === bk.name ? 'selected' : ''}>
                      ${bk.name} (${bk.institution_or_client || bk.applicable_entity || 'Global'})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Priority Flag <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <select id="intake-priority" class="design-select">
                  <option value="normal" ${intakeForm.priority === 'normal' ? 'selected' : ''}>Normal Priority (Standard Queue)</option>
                  <option value="high" ${intakeForm.priority === 'high' ? 'selected' : ''}>High Priority (48h Turnaround)</option>
                  <option value="urgent" ${intakeForm.priority === 'urgent' ? 'selected' : ''}>Urgent Priority (Direct Lead Escalation)</option>
                </select>
              </div>
            </div>

            <!-- Audience & Publication Channel (Optional) -->
            <div class="form-grid-2">
              <div class="form-group">
                <label style="font-weight:700;">Target Audience (Optional)</label>
                <input type="text" id="intake-audience" class="design-input" placeholder="e.g. Undergrad CS students &amp; Industry delegates" value="${intakeForm.target_audience}">
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Publication Channel (Optional)</label>
                <input type="text" id="intake-channel" class="design-input" placeholder="e.g. Instagram feed, Campus noticeboards, Website banner" value="${intakeForm.publishing_channel}">
              </div>
            </div>

            <!-- Required-by Date (Date Only, No Time Picker) and Branding Constraints -->
            <div class="form-grid-2">
              <div class="form-group">
                <label style="font-weight:700;">Required-by Date <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <input type="date" id="intake-required-by" class="design-input" value="${intakeForm.required_by}">
                <small style="color: #64748b; font-size: 0.74rem;">Requester deadline date. The Design Lead sets the committed delivery date during assignment.</small>
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Special Colour or Branding Constraints (Optional)</label>
                <input type="text" id="intake-brand-constraints" class="design-input" placeholder="e.g. Sponsor logos on bottom bar; Gold &amp; Navy palette" value="${intakeForm.brand_constraints}">
              </div>
            </div>

            <!-- Exact Text to Include in the Design (Renamed with clear instruction) -->
            <div class="form-group">
              <label style="font-weight:700;">
                Exact Text to Include in the Design ${['poster', 'social_creative', 'presentation'].includes(intakeForm.work_type) ? '<span class="required" style="color: #dc2626; font-weight:800;">*</span>' : '<span style="font-weight:400; color:#64748b; font-size:0.8rem;">(Optional)</span>'}
              </label>
              <textarea id="intake-copy" class="form-textarea" placeholder="Paste exact headline, body copy, dates, speaker names, venue, and registration links exactly as they must appear inside the deliverable...">${intakeForm.final_copy}</textarea>
              <small style="color: #64748b; font-size: 0.74rem;">Distinct from request title. Provide the exact wording, names, dates, event details, and other text to appear inside the deliverable so designers can copy-paste without spelling or date discrepancies.</small>
            </div>

            <!-- Reference Links & Requester Attachments -->
            <div class="form-grid-2">
              <div class="form-group">
                <label style="font-weight:700;">Reference Links / Visual Moodboard (Optional)</label>
                <input type="text" id="intake-ref" class="design-input" placeholder="https://dribbble.com/... or Figma board link" value="${intakeForm.reference_links}">
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Requester Attachments (Optional)</label>
                <input type="text" id="intake-attachments" class="design-input" placeholder="https://drive.google.com/... cloud folder link" value="${intakeForm.requester_attachments}">
                <small style="color: #64748b; font-size: 0.74rem;">Logos, speaker photos, raw footage. Deliverables are submitted separately.</small>
              </div>
            </div>
          </div>

          <div style="margin-top: 1.75rem; display: flex; justify-content: space-between;">
            <button class="design-btn design-btn-secondary" id="btn-step-2-back">&larr; Back</button>
            <button class="design-btn design-btn-primary" id="btn-step-2-next">Continue to Type-Specific Fields &rarr;</button>
          </div>
        ` : ''}

        <!-- Step 3: Type-Specific Fields -->
        ${intakeStep === 3 ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1.25rem; margin: 0 0 0.4rem 0;">Step 3: ${workTypeLabels[intakeForm.work_type]} Specifics</h3>
            <p style="color: #64748b; font-size: 0.88rem; margin: 0;">Fields customized strictly for ${workTypeLabels[intakeForm.work_type]}.</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${intakeForm.work_type === 'poster' ? `
              <div class="form-grid-2">
                <div class="form-group">
                  <label style="font-weight:700;">Dimensions or Preset Size <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <input type="text" id="type-dimensions" class="design-input" placeholder="A2 (420 x 594 mm), A3, 1080x1350, or Custom" value="A2 (420 x 594 mm)">
                </div>
                <div class="form-group">
                  <label style="font-weight:700;">Medium Format <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <select id="type-format" class="design-select">
                    <option value="print">Print Ready (CMYK)</option>
                    <option value="digital">Digital Display (RGB)</option>
                  </select>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group" id="wrap-bleed">
                  <label style="font-weight:700;">Bleed &amp; DPI (For Print) <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <input type="text" id="type-bleed" class="design-input" placeholder="3mm bleed, 300 DPI CMYK" value="3mm bleed, 300 DPI CMYK">
                </div>
                <div class="form-group">
                  <label style="font-weight:700;">Orientation <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <select id="type-orientation" class="design-select">
                    <option value="Portrait">Portrait</option>
                    <option value="Landscape">Landscape</option>
                    <option value="Square">Square</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Number of Size Variants</label>
                <input type="number" id="type-variants" class="design-input" min="1" max="10" value="1" placeholder="e.g. 1 (Standee) or 2 (Standee + A4 Handout)">
              </div>
            ` : ''}

            ${intakeForm.work_type === 'social_creative' ? `
              <div class="form-grid-2">
                <div class="form-group">
                  <label style="font-weight:700;">Target Platform(s) <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <input type="text" id="type-social-platforms" class="design-input" placeholder="Instagram, LinkedIn, X, Facebook" value="Instagram & LinkedIn">
                </div>
                <div class="form-group">
                  <label style="font-weight:700;">Creative Format <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <select id="type-social-format" class="design-select">
                    <option value="single_post">Single Feed Post</option>
                    <option value="story">Story / Status (9:16)</option>
                    <option value="carousel">Carousel (Swipe Deck)</option>
                  </select>
                </div>
              </div>

              <div class="form-group" id="wrap-carousel-slides">
                <label style="font-weight:700;">Number of Carousel Slides (If Carousel)</label>
                <input type="number" id="type-carousel-slides" class="design-input" min="1" max="10" value="4">
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Accompanying Social Caption Text &amp; Hashtags (Optional)</label>
                <textarea id="type-caption-text" class="form-textarea" placeholder="Draft social media copy, hashtags, speaker tags..."></textarea>
              </div>
            ` : ''}

            ${intakeForm.work_type === 'video_motion' ? `
              <div class="form-grid-2">
                <div class="form-group">
                  <label style="font-weight:700;">Target Duration <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <input type="text" id="type-video-duration" class="design-input" placeholder="e.g. 30s reel, 60s promo, or 3 min video" value="30s">
                </div>
                <div class="form-group">
                  <label style="font-weight:700;">Aspect Ratio <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <select id="type-video-ratio" class="design-select">
                    <option value="9:16">9:16 (Vertical Reel / YouTube Shorts)</option>
                    <option value="16:9">16:9 (Landscape Standard / YouTube)</option>
                    <option value="1:1">1:1 (Square Feed)</option>
                    <option value="4:5">4:5 (Portrait Feed)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Raw Footage or Drive Links <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <input type="text" id="type-footage-links" class="design-input" placeholder="https://drive.google.com/drive/folders/... raw video assets">
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label style="font-weight:700;">Voice-over &amp; Subtitle Requirements</label>
                  <select id="type-subtitles" class="design-select">
                    <option value="subtitles_burned">Burned-in Subtitles Required</option>
                    <option value="voiceover_and_subs">Voice-over + Subtitles Required</option>
                    <option value="none">No Voice-over or Subtitles</option>
                  </select>
                </div>
                <div class="form-group">
                  <label style="font-weight:700;">Caption Language</label>
                  <input type="text" id="type-video-lang" class="design-input" placeholder="e.g. English, Malayalam, or Bilingual" value="English">
                </div>
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Music &amp; Audio Preferences (Optional)</label>
                <input type="text" id="type-music" class="design-input" placeholder="e.g. Upbeat energetic synth, subtle ambient corporate, acoustic">
              </div>
            ` : ''}

            ${intakeForm.work_type === 'presentation' ? `
              <div class="form-grid-2">
                <div class="form-group">
                  <label style="font-weight:700;">Slide or Page Count <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <input type="number" id="type-slide-count" class="design-input" min="1" max="100" value="12">
                </div>
                <div class="form-group">
                  <label style="font-weight:700;">Template Preference <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                  <select id="type-template-pref" class="design-select">
                    <option value="existing_template">Use Existing Master Brand Deck Template</option>
                    <option value="from_scratch">Design Custom Style from Scratch</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Source Content Document Link <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <input type="text" id="type-source-doc" class="design-input" placeholder="https://docs.google.com/document/d/... presentation bullet points or script">
              </div>
            ` : ''}

            ${intakeForm.work_type === 'other' ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #1e40af; margin-bottom: 0.5rem;">
                ℹ️ <strong>Design Head Scoping:</strong> Non-standard requests are automatically routed directly to the Design Head for technical scoping, format definition, and timeline estimation.
              </div>

              <div class="form-group">
                <label style="font-weight:700;">Detailed Description of Requested Work <span class="required" style="color: #dc2626; font-weight:800;">*</span></label>
                <textarea id="type-other-scope" class="form-textarea" placeholder="Detail the requested deliverable, format, dimensions, reference files, and delivery expectations..." style="height: 120px;"></textarea>
              </div>
            ` : ''}
          </div>

          <div style="margin-top: 1.75rem; display: flex; justify-content: space-between;">
            <button class="design-btn design-btn-secondary" id="btn-step-3-back">&larr; Back</button>
            <button class="design-btn design-btn-primary" id="btn-submit-intake">
              🚀 Submit Creative Request
            </button>
          </div>
        ` : ''}
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Step 1: Work Type Card Selection
    container.querySelectorAll('.work-type-card').forEach(card => {
      card.addEventListener('click', () => {
        intakeForm.work_type = card.dataset.type;
        container.querySelectorAll('.work-type-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    const step1Next = container.querySelector('#btn-step-1-next');
    if (step1Next) {
      step1Next.addEventListener('click', () => {
        intakeStep = 2;
        render();
      });
    }

    // Step 2: Validation and Proceed to Step 3
    const step2Back = container.querySelector('#btn-step-2-back');
    if (step2Back) step2Back.addEventListener('click', () => { intakeStep = 1; render(); });

    const step2Next = container.querySelector('#btn-step-2-next');
    if (step2Next) {
      step2Next.addEventListener('click', () => {
        const title = container.querySelector('#intake-title')?.value.trim();
        const purpose = container.querySelector('#intake-purpose')?.value.trim();
        const division = container.querySelector('#intake-division')?.value;
        const brandKit = container.querySelector('#intake-brand-kit')?.value;
        const audience = container.querySelector('#intake-audience')?.value.trim();
        const channel = container.querySelector('#intake-channel')?.value.trim();
        const reqDate = container.querySelector('#intake-required-by')?.value;
        const copy = container.querySelector('#intake-copy')?.value.trim();

        if (!title) {
          toast('Request title is mandatory.', 'warning');
          return;
        }
        if (!reqDate) {
          toast('Required-by date is required.', 'warning');
          return;
        }

        // Validate exact copy for work types that need fixed text
        if (['poster', 'social_creative', 'presentation'].includes(intakeForm.work_type) && !copy) {
          toast('Exact Text to Include in the Design is required for this work type.', 'warning');
          return;
        }

        intakeForm.title = title;
        intakeForm.purpose = purpose || '';
        intakeForm.project_id = null;
        intakeForm.brand_kit_name = brandKit || 'RLabZ Core Platform Brand Kit';
        intakeForm.requesting_division = division;
        intakeForm.priority = container.querySelector('#intake-priority')?.value || 'normal';
        intakeForm.target_audience = audience;
        intakeForm.publishing_channel = channel;
        intakeForm.required_by = reqDate;
        intakeForm.final_copy = copy;
        intakeForm.reference_links = container.querySelector('#intake-ref')?.value || '';
        intakeForm.brand_constraints = container.querySelector('#intake-brand-constraints')?.value || '';
        intakeForm.requester_attachments = container.querySelector('#intake-attachments')?.value || '';

        intakeStep = 3;
        render();
      });
    }

    // Step 3: Back & Submit
    const step3Back = container.querySelector('#btn-step-3-back');
    if (step3Back) step3Back.addEventListener('click', () => { intakeStep = 2; render(); });

    const submitBtn = container.querySelector('#btn-submit-intake');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        // Collect type-specific fields based on work_type
        if (intakeForm.work_type === 'poster') {
          const dims = container.querySelector('#type-dimensions')?.value.trim();
          if (!dims) {
            toast('Dimensions are required for posters.', 'warning');
            return;
          }
          intakeForm.type_specific_fields = {
            dimensions: dims,
            format: container.querySelector('#type-format')?.value,
            bleed_dpi: container.querySelector('#type-bleed')?.value,
            orientation: container.querySelector('#type-orientation')?.value,
            size_variants: container.querySelector('#type-variants')?.value || '1'
          };
        } else if (intakeForm.work_type === 'social_creative') {
          const platforms = container.querySelector('#type-social-platforms')?.value.trim();
          if (!platforms) {
            toast('Target platforms are required for social media creatives.', 'warning');
            return;
          }
          intakeForm.type_specific_fields = {
            platforms,
            format: container.querySelector('#type-social-format')?.value,
            carousel_slides: container.querySelector('#type-carousel-slides')?.value,
            caption_text: container.querySelector('#type-caption-text')?.value
          };
        } else if (intakeForm.work_type === 'video_motion') {
          const duration = container.querySelector('#type-video-duration')?.value.trim();
          const footage = container.querySelector('#type-footage-links')?.value.trim();
          if (!duration) {
            toast('Target duration is required for video requests.', 'warning');
            return;
          }
          intakeForm.type_specific_fields = {
            target_duration: duration,
            aspect_ratio: container.querySelector('#type-video-ratio')?.value,
            raw_footage_links: footage || '',
            subtitles: container.querySelector('#type-subtitles')?.value,
            language: container.querySelector('#type-video-lang')?.value,
            music: container.querySelector('#type-music')?.value
          };
        } else if (intakeForm.work_type === 'presentation') {
          const sourceDoc = container.querySelector('#type-source-doc')?.value.trim();
          intakeForm.type_specific_fields = {
            slide_count: container.querySelector('#type-slide-count')?.value || '10',
            template_preference: container.querySelector('#type-template-pref')?.value,
            source_doc: sourceDoc || ''
          };
        } else {
          const otherScope = container.querySelector('#type-other-scope')?.value.trim();
          if (!otherScope) {
            toast('Please describe the requested work so the Design Head can scope it.', 'warning');
            return;
          }
          intakeForm.type_specific_fields = {
            scope_notes: otherScope,
            requires_lead_scoping: true
          };
        }

        try {
          const res = await fetch(`${API_BASE}/design/tickets`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(intakeForm)
          });
          const result = await res.json();
          if (result.status === 'success') {
            await Swal.fire({
              title: 'Request Brief Submitted!',
              html: `
                <div style="font-size:0.9rem; color:#475569;">
                  Creative ticket <strong style="color:#2563eb;">${result.ticket_number}</strong> created successfully.<br>
                  Routed to the Design Head for allocation.
                </div>
              `,
              icon: 'success',
              confirmButtonColor: '#059669',
              confirmButtonText: 'View in Tickets'
            });
            router.push('/design/tickets');
          } else {
            toast(result.message || 'Error submitting request brief', 'error');
          }
        } catch (e) {
          console.error(e);
          toast('Network error creating request', 'error');
        }
      });
    }
  }

  render();
  return container;
}

export default DesignRequests;

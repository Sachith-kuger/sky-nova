const API_BASE = '/api/insights';

function showToast(message, type = 'success') {
    let tc = document.getElementById('toast-container');
    if (!tc) { tc = document.createElement('div'); tc.id = 'toast-container'; tc.className = 'toast-container position-fixed bottom-0 end-0 p-3'; tc.style.zIndex = '1055'; document.body.appendChild(tc); }
    const id = 'toast-' + Date.now();
    tc.insertAdjacentHTML('beforeend', `<div id="${id}" class="toast align-items-center text-white ${type==='success'?'bg-success':'bg-danger'} border-0"><div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`);
    new bootstrap.Toast(document.getElementById(id)).show();
}

// ============ SEARCH PAGE ============
async function fetchFlights(event) {
    if (event) event.preventDefault();
    const dep = document.getElementById('departureCity').value;
    const arr = document.getElementById('arrivalCity').value;
    const date = document.getElementById('departureDate').value;
    const pax = document.getElementById('passengerCount')?.value || 1;
    const cls = document.getElementById('travelClass')?.value || 'economy';
    const box = document.getElementById('flight-results');
    if (!box) return;
    if (dep.trim().toLowerCase() === arr.trim().toLowerCase()) { box.innerHTML = '<p class="text-center text-danger mt-4"><i class="fas fa-exclamation-triangle me-2"></i>Departure and arrival cannot be the same.</p>'; return; }
    box.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-danger"></div><p class="mt-3 text-muted">Searching flights...</p></div>';
    try {
        const res = await fetch(`/api/flights/search?dep=${encodeURIComponent(dep)}&arr=${encodeURIComponent(arr)}&date=${encodeURIComponent(date)}&passengers=${pax}&class=${cls}`);
        const flights = await res.json();
        if (!flights.length) { box.innerHTML = '<div class="text-center py-5"><i class="fas fa-plane-slash fa-3x mb-3 text-muted" style="opacity:.3"></i><h5 class="text-muted">No flights found for this route</h5><p class="text-muted small">Try different dates or cities</p></div>'; return; }
        const isReschedule = new URLSearchParams(window.location.search).has('reschedule');
        const rescheduleBanner = isReschedule ? `<div class="alert alert-info py-2 px-3 mb-3" style="font-size:12px; border-radius:8px"><i class="fas fa-info-circle me-2"></i><strong>Reschedule Mode:</strong> Select a new flight below. Price differences will be applied.</div>` : '';
        box.innerHTML = rescheduleBanner + `<div class="d-flex justify-content-between align-items-center mb-3"><div><h6 class="fw-bold mb-0" style="font-size:15px">${flights.length} flights found</h6><p class="mb-0" style="font-size:11px;color:var(--text-tertiary)">${dep} → ${arr} · ${pax} pax · ${cls}</p></div><div style="font-size:11px;color:var(--text-tertiary)">Sorted by price</div></div>` + flights.map((f, i) => `
            <div class="flight-result-card glass-card mb-3 p-0" style="cursor:pointer;animation:slideUp 0.35s var(--ease) both;animation-delay:${i*0.04}s" onclick="selectFlight(${f.id}, '${f.airline}', '${f.dep_city}', '${f.arr_city}', '${f.dep_code}', '${f.arr_code}', '${f.dep_time}', '${f.arr_time}', '${f.duration}', ${f.price}, ${f.total_price}, '${f.stops_text}', '${f.dep_date}', ${pax}, '${cls}')">
                <div class="d-flex align-items-center p-3 px-4">
                    <div class="me-4" style="min-width:80px">
                        <div class="fw-bold" style="font-size:13px">${f.airline}</div>
                        <div class="mono" style="font-size:10.5px;color:var(--text-tertiary)">SN-${f.id}</div>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="text-center">
                                <div class="fw-bold" style="font-size:20px;letter-spacing:-0.03em">${f.dep_time}</div>
                                <div class="mono" style="font-size:11px;color:var(--text-secondary)">${f.dep_code}</div>
                            </div>
                            <div class="flex-grow-1 mx-4 text-center">
                                <div style="font-size:10px;color:var(--text-tertiary);font-weight:600">${f.duration}</div>
                                <div class="position-relative my-1" style="height:2px;background:rgba(255,255,255,0.1);border-radius:2px">
                                    <div style="position:absolute;top:-3px;left:50%;transform:translateX(-50%);width:8px;height:8px;border-radius:50%;background:var(--accent)"></div>
                                </div>
                                <div style="font-size:10px;font-weight:600;color:${f.stops===0?'#10b981':'#f59e0b'}">${f.stops_text}</div>
                            </div>
                            <div class="text-center">
                                <div class="fw-bold" style="font-size:20px;letter-spacing:-0.03em">${f.arr_time}</div>
                                <div class="mono" style="font-size:11px;color:var(--text-secondary)">${f.arr_code}</div>
                            </div>
                        </div>
                    </div>
                    <div class="ms-4 text-end" style="min-width:110px">
                        <div class="mono fw-bold" style="font-size:22px;color:var(--accent);letter-spacing:-0.03em">₹${f.price.toLocaleString()}</div>
                        <div style="font-size:10px;color:var(--text-tertiary)">per person</div>
                        ${parseInt(pax)>1?`<div class="mono fw-bold" style="font-size:12px;margin-top:2px">₹${f.total_price.toLocaleString()} total</div>`:''}
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center px-4 py-2" style="background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.05)">
                    <div class="d-flex gap-3" style="font-size:10.5px;color:var(--text-tertiary)">
                        <span><i class="fas fa-suitcase me-1"></i>Cabin bag</span>
                        <span><i class="fas fa-chair me-1"></i>${f.seats} left</span>
                    </div>
                    <span class="btn btn-accent btn-sm px-3" style="font-size:11.5px;padding:6px 16px;border-radius:6px">Select →</span>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); box.innerHTML = '<p class="text-danger text-center">Failed to fetch flights.</p>'; }
}

function selectFlight(id, airline, depCity, arrCity, depCode, arrCode, depTime, arrTime, duration, price, totalPrice, stopsText, depDate, pax, cls) {
    const params = new URLSearchParams(window.location.search);
    const rescheduleGroupId = params.get('reschedule');
    if (rescheduleGroupId) {
        if (confirm(`Reschedule your booking to ${airline} flight SN-${id}?`)) {
            processReschedule(rescheduleGroupId, id);
        }
        return;
    }
    
    const outParams = new URLSearchParams({flightId:id, airline, depCity, arrCity, depCode, arrCode, depTime, arrTime, duration, price, totalPrice, stopsText, depDate, passengers:pax, class:cls});
    window.location.href = `/booking?${outParams.toString()}`;
}

async function processReschedule(groupId, newFlightId) {
    try {
        const res = await fetch('/api/bookings/reschedule', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({groupId, newFlightId})
        });
        const result = await res.json();
        if (result.success) {
            showToast('Flight rescheduled successfully!', 'success');
            setTimeout(() => window.location.href = '/my-bookings', 1500);
        } else {
            showToast(result.message || 'Failed to reschedule', 'error');
        }
    } catch(e) {
        console.error(e);
        showToast('Error processing reschedule', 'error');
    }
}

// ============ BOOKING PAGE ============
function initBookingPage() {
    const params = new URLSearchParams(window.location.search);
    const flightId = params.get('flightId');
    if (!flightId) { loadAvailableFlights(); return; }

    const pax = parseInt(params.get('passengers')) || 1;
    const price = parseFloat(params.get('price')) || 0;
    const total = parseFloat(params.get('totalPrice')) || price;
    const cls = params.get('class') || 'economy';

    // Show flight summary
    const summary = document.getElementById('flightSummary');
    if (summary) {
        summary.innerHTML = `
        <div class="glass-card mb-4 p-4" style="border-left:4px solid var(--accent)">
            <h6 class="fw-bold mb-3"><i class="fas fa-plane-departure me-2" style="color:var(--accent)"></i>Selected Flight</h6>
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                    <div class="fw-bold">${params.get('airline')} · <span class="mono">SN-${flightId}</span></div>
                    <div style="color:var(--text-tertiary);font-size:12px">${params.get('depDate')}</div>
                </div>
                <div class="text-center">
                    <span class="fw-bold">${params.get('depTime')}</span>
                    <span class="mx-2" style="color:var(--text-tertiary)">${params.get('depCode')} → ${params.get('arrCode')}</span>
                    <span class="fw-bold">${params.get('arrTime')}</span>
                </div>
                <div class="text-end">
                    <div class="mono fw-bold" style="color:var(--accent);font-size:20px">₹${parseInt(total).toLocaleString()}</div>
                    <div style="color:var(--text-tertiary);font-size:12px">${pax} traveler(s)</div>
                </div>
            </div>
        </div>`;
        summary.style.display = 'block';
    }

    // Build traveler forms
    const container = document.getElementById('travelerForms');
    if (container) {
        let html = '';
        for (let i = 0; i < pax; i++) {
            html += `
            <div class="glass-card mb-3 p-4" style="animation:slideUp 0.4s var(--ease) both;animation-delay:${0.15+i*0.05}s">
                <h6 class="fw-bold mb-3"><i class="fas fa-user me-2" style="color:var(--accent)"></i>Traveler ${i+1}</h6>
                <div class="row g-3">
                    <div class="col-md-3"><label class="form-label-dark">First Name</label><input type="text" class="form-control form-control-dark" id="tFirstName${i}" required placeholder="John"></div>
                    <div class="col-md-3"><label class="form-label-dark">Last Name</label><input type="text" class="form-control form-control-dark" id="tLastName${i}" required placeholder="Doe"></div>
                    <div class="col-md-3"><label class="form-label-dark">Email</label><input type="email" class="form-control form-control-dark" id="tEmail${i}" required placeholder="you@email.com"></div>
                    <div class="col-md-3">
                        <label class="form-label-dark">Class</label>
                        <select class="form-select form-select-dark" id="tClass${i}">
                            <option value="economy" ${cls==='economy'?'selected':''}>Economy</option>
                            <option value="business" ${cls==='business'?'selected':''}>Business</option>
                            <option value="first" ${cls==='first'?'selected':''}>First Class</option>
                        </select>
                    </div>
                </div>
            </div>`;
        }
        container.innerHTML = html;
    }

    // Hide old flight select
    const oldSelect = document.getElementById('flightSelectSection');
    if (oldSelect) oldSelect.style.display = 'none';

    // Set hidden values
    const fid = document.getElementById('hiddenFlightId');
    if (fid) { fid.value = flightId; }

    // Price summary
    const updatePrice = () => {
        const classMult = { 'economy': 1, 'business': 1.8, 'first': 3.0 };
        const originalMult = classMult[cls] || 1;
        const trueBase = price / originalMult;
        
        let totalBase = 0;
        if (document.getElementById('tFirstName0')) {
            for (let i = 0; i < pax; i++) {
                const select = document.getElementById(`tClass${i}`);
                const selectedClass = select ? select.value : cls;
                totalBase += trueBase * (classMult[selectedClass] || 1);
            }
        } else {
            const select = document.getElementById('travelClass');
            const selectedClass = select ? select.value : cls;
            totalBase += trueBase * (classMult[selectedClass] || 1) * pax;
        }
        
        const taxes = Math.round(totalBase * 0.05);
        const total = Math.round(totalBase + taxes);
        
        const priceBox = document.getElementById('priceSummary');
        if (priceBox) {
            priceBox.innerHTML = `
            <div class="glass-card p-4" style="animation:slideUp 0.4s var(--ease) both;animation-delay:0.2s">
                <h6 class="fw-bold mb-3 pb-2" style="border-bottom:1px solid var(--card-border)">Price Breakdown</h6>
                <div class="d-flex justify-content-between mb-2"><span style="color:var(--text-secondary)">Base fare × ${pax}</span><span class="mono">₹${Math.round(totalBase).toLocaleString()}</span></div>
                <div class="d-flex justify-content-between mb-2"><span style="color:var(--text-secondary)">Taxes & fees</span><span class="mono">₹${taxes.toLocaleString()}</span></div>
                <hr style="border-color:var(--card-border)">
                <div class="d-flex justify-content-between fw-bold" style="font-size:18px"><span>Total</span><span class="mono" style="color:var(--accent)">₹${total.toLocaleString()}</span></div>
            </div>`;
            priceBox.style.display = 'block';
        }
    };
    
    updatePrice();
    
    if (document.getElementById('tFirstName0')) {
        for (let i = 0; i < pax; i++) {
            const select = document.getElementById(`tClass${i}`);
            if (select) select.addEventListener('change', updatePrice);
        }
    } else {
        const select = document.getElementById('travelClass');
        if (select) select.addEventListener('change', updatePrice);
    }
}

async function bookTicket(event) {
    if (event) event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const flightId = params.get('flightId') || document.getElementById('hiddenFlightId')?.value || document.getElementById('flightSelect')?.value;
    const pax = parseInt(params.get('passengers')) || 1;
    const cls = params.get('class') || 'economy';

    let travelers = [];
    if (document.getElementById('tFirstName0')) {
        for (let i = 0; i < pax; i++) {
            travelers.push({
                firstName: document.getElementById(`tFirstName${i}`).value,
                lastName: document.getElementById(`tLastName${i}`).value,
                email: document.getElementById(`tEmail${i}`).value,
                travelClass: document.getElementById(`tClass${i}`)?.value || cls
            });
        }
    } else {
        travelers.push({
            firstName: document.getElementById('firstName')?.value || '',
            lastName: document.getElementById('lastName')?.value || '',
            email: document.getElementById('email')?.value || '',
            travelClass: document.getElementById('travelClass')?.value || cls
        });
    }

    const btn = event?.target?.querySelector('button[type="submit"]') || document.querySelector('#bookingForm button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...'; }

    try {
        const res = await fetch('/api/bookings/book', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({flightId, passengers: pax, class: cls, travelers})
        });
        const result = await res.json();
        if (res.status === 401) { window.location.href = '/user/login'; return; }
        
        if (result.success && result.primary_booking_id) {
            window.location.href = `/booking-confirmation/${result.primary_booking_id}`;
        } else if (result.success) {
            showToast(result.message, 'success');
            // If no redirection but success, at least reset button
            if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm Booking <i class="fas fa-check-circle ms-2"></i>'; }
        } else { 
            showToast(result.message, 'error'); 
            if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm Booking <i class="fas fa-check-circle ms-2"></i>'; } 
        }
    } catch (e) { 
        console.error(e); 
        showToast('Booking failed.', 'error'); 
        if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm Booking <i class="fas fa-check-circle ms-2"></i>'; } 
    }
}

async function loadAvailableFlights() {
    const s = document.getElementById('flightSelect'); if (!s) return;
    try {
        const res = await fetch('/api/flights/all'); const flights = await res.json();
        s.innerHTML = '<option value="">Select a flight...</option>';
        flights.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.label; s.appendChild(o); });
        const p = new URLSearchParams(window.location.search).get('flightId');
        if (p) s.value = p;
    } catch (e) { s.innerHTML = '<option value="">Failed to load</option>'; }
}

// ============ CONFIRMATION PAGE ============
async function loadConfirmation(bookingId) {
    try {
        const res = await fetch(`/api/booking/${bookingId}`);
        const b = await res.json();
        if (b.error) { document.getElementById('confirmationContent').innerHTML = '<p class="text-danger">Booking not found</p>'; return; }
        
        const travelers = b.travelers || [{name: b.passenger_name, seat: b.seat}];
        const travelerHtml = travelers.map(t => {
            const isCxl = (t.status || 'Confirmed').toLowerCase() === 'cancelled';
            const tColor = isCxl ? '#ef4444' : '#10b981';
            return `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 px-3" style="background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05)">
                <div class="d-flex align-items-center gap-3">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:700;font-size:12px">${t.name.charAt(0)}</div>
                    <div>
                        <div class="fw-bold" style="font-size:14px;${isCxl?'text-decoration:line-through;opacity:0.6':''}">${t.name}</div>
                        <div class="mono" style="font-size:10px;color:var(--text-tertiary)">SEAT: ${t.seat || 'Auto'} • CLASS: ${t.class || 'Economy'}</div>
                    </div>
                </div>
                <div class="mono" style="font-size:11px;font-weight:600;color:${tColor}">${(t.status || 'CONFIRMED').toUpperCase()}</div>
            </div>
        `}).join('');

        const isMainCxl = (b.status || 'Confirmed').toLowerCase() === 'cancelled';
        const mainBg = isMainCxl ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)';
        const mainBadgeBg = isMainCxl ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)';
        const mainColor = isMainCxl ? '#ef4444' : '#10b981';
        const iconClass = isMainCxl ? 'fa-times' : 'fa-check';

        document.getElementById('confirmationContent').innerHTML = `
        <div class="text-center mb-5">
            <div style="width:80px;height:80px;border-radius:50%;background:${mainBg};margin:0 auto 20px;display:flex;align-items:center;justify-content:center"><i class="fas ${iconClass} fa-2x" style="color:${mainColor}"></i></div>
            <h2 class="fw-bold">${isMainCxl ? 'Booking Cancelled' : 'Booking Confirmed!'}</h2>
            <p style="color:var(--text-tertiary)">Your PNR: <span class="mono fw-bold fs-5" style="color:var(--accent)">${b.pnr}</span></p>
        </div>
        <div class="glass-card p-4 mb-4" style="border:1px solid var(--card-border)">
            <div class="row g-4">
                <div class="col-md-8">
                    <div class="d-flex justify-content-between align-items-start mb-4">
                        <div><div class="fw-bold fs-5">${b.airline}</div><div class="mono" style="color:var(--text-tertiary);font-size:12px">Flight SN-${b.flight_id}</div></div>
                        <span class="badge px-3 py-2" style="background:${mainBadgeBg};color:${mainColor}">${b.status || 'Confirmed'}</span>
                    </div>
                    <div class="d-flex align-items-center mb-4">
                        <div class="text-center"><div class="fw-bold fs-4">${b.dep_time_only}</div><div class="fw-bold mono">${b.dep_code}</div><div style="color:var(--text-tertiary);font-size:12px">${b.dep_city}</div></div>
                        <div class="flex-grow-1 mx-4 text-center"><hr style="border-top:2px dashed rgba(255,255,255,0.1)"><i class="fas fa-plane" style="color:var(--accent)"></i></div>
                        <div class="text-center"><div class="fw-bold fs-4">—</div><div class="fw-bold mono">${b.arr_code}</div><div style="color:var(--text-tertiary);font-size:12px">${b.arr_city}</div></div>
                    </div>
                    
                    <div class="mb-3"><div style="color:var(--text-tertiary);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">PASSENGERS</div>
                        ${travelerHtml}
                    </div>

                    <div class="row g-3 mt-2">
                        <div class="col-6"><div style="color:var(--text-tertiary);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">DEPARTURE DATE</div><div class="fw-bold">${b.dep_date_formatted}</div></div>
                        <div class="col-6"><div style="color:var(--text-tertiary);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">CLASS</div><div class="fw-bold">${travelers.length === 1 ? travelers[0].class : 'Mixed (See above)'}</div></div>
                    </div>
                </div>
                <div class="col-md-4 text-center d-flex flex-column justify-content-center" style="border-left:1px solid rgba(255,255,255,0.08)">
                    <div style="color:var(--text-tertiary);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">TOTAL AMOUNT PAID</div>
                    <div class="mono fw-bold fs-3" style="color:var(--accent)">₹${b.paid.toLocaleString()}</div>
                    <div class="mono" style="color:var(--text-tertiary);font-size:12px;margin-top:4px">Booking Ref: #${b.id}</div>
                </div>
            </div>
        </div>
        <div class="d-flex gap-3 justify-content-center">
            <a href="/my-bookings" class="btn btn-accent px-4"><i class="fas fa-list me-2"></i>My Trips</a>
            <a href="/search" class="btn btn-ghost px-4"><i class="fas fa-search me-2"></i>Search More</a>
            <button onclick="window.print()" class="btn btn-ghost px-4"><i class="fas fa-print me-2"></i>Print</button>
        </div>`;
    } catch (e) { console.error(e); }
}

// ============ MY BOOKINGS ============
async function loadMyBookings() {
    const c = document.getElementById('myBookingsList'); if (!c) return;
    c.innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--accent)"></div></div>';
    try {
        const res = await fetch('/api/my-bookings'); const bookings = await res.json();
        if (!bookings.length) { c.innerHTML = '<div class="text-center py-5"><div style="width:64px;height:64px;border-radius:16px;background:var(--accent-soft);margin:0 auto 16px;display:flex;align-items:center;justify-content:center"><i class="fas fa-ticket-alt" style="font-size:24px;color:var(--accent);opacity:0.5"></i></div><h5 class="fw-bold">No trips yet</h5><p style="color:var(--text-tertiary)">Your booked flights will appear here</p><a href="/search" class="btn btn-accent mt-2">Find Flights</a></div>'; return; }
        c.innerHTML = bookings.map((b,i) => {
            const isPartial = b.status === 'Partially Cancelled';
            const stBg = b.status === 'Confirmed' ? 'rgba(16,185,129,0.15)' : b.status === 'Completed' ? 'rgba(59,130,246,0.15)' : isPartial ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
            const stColor = b.status === 'Confirmed' ? '#10b981' : b.status === 'Completed' ? '#3b82f6' : isPartial ? '#f59e0b' : '#ef4444';
            const pax = b.passengers || [];
            const paxCount = pax.length;
            const paxBadge = paxCount > 1 ? `<span class="badge ms-2" style="background:rgba(59,130,246,0.15);color:#3b82f6;font-size:10px">${paxCount} Passengers</span>` : '';
            const passengerRows = pax.map(p => {
                const isCxl = (p.status || '').toLowerCase() === 'cancelled';
                const cxlBtn = (!isCxl && b.status !== 'Completed') ? `<button onclick="cancelGroupBooking(['${p.booking_id}'])" class="btn btn-sm btn-link text-danger p-0 ms-3" style="font-size:11px;text-decoration:none;font-weight:600">Cancel</button>` : '';
                return `
                <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid rgba(255,255,255,0.04)">
                    <div class="d-flex align-items-center gap-2">
                        <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent)">${p.name.charAt(0)}</div>
                        <div><div style="font-size:13px;font-weight:600;${isCxl?'text-decoration:line-through;opacity:0.5':''}">${p.name}</div><div class="mono" style="font-size:10px;color:var(--text-tertiary)">Seat ${p.seat||'Auto'} • ${p.class||'Economy'}</div></div>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="mono" style="font-size:12px;font-weight:600;${isCxl?'text-decoration:line-through;opacity:0.5':''}">₹${p.paid.toLocaleString()}</div>
                        ${isCxl ? `<span class="badge bg-danger ms-3" style="font-size:9px">Cancelled</span>` : cxlBtn}
                    </div>
                </div>`;
            }).join('');
            const cancellableIds = pax.filter(p => (p.status||'').toLowerCase() !== 'cancelled').map(p => p.booking_id);
            const canCancelAll = (b.status !== 'Completed' && cancellableIds.length > 1);
            return `
            <div class="glass-card mb-3 p-4" style="animation:slideUp 0.35s var(--ease) both;animation-delay:${i*0.04}s">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div><span class="fw-bold fs-5">${b.airline}</span><span class="mono ms-2" style="color:var(--text-tertiary);font-size:12px">SN-${b.flight_id}</span>${paxBadge}</div>
                    <span class="badge px-3 py-2" style="background:${stBg};color:${stColor}">${b.status}</span>
                </div>
                <div class="d-flex align-items-center mb-3">
                    <div class="text-center"><div class="fw-bold mono fs-5">${b.dep_code}</div><div style="color:var(--text-tertiary);font-size:12px">${b.dep_city}</div></div>
                    <div class="flex-grow-1 mx-3 text-center"><i class="fas fa-long-arrow-alt-right" style="color:var(--text-tertiary)"></i></div>
                    <div class="text-center"><div class="fw-bold mono fs-5">${b.arr_code}</div><div style="color:var(--text-tertiary);font-size:12px">${b.arr_city}</div></div>
                    <div class="ms-auto text-end">
                        <div class="mono fw-bold fs-5" style="color:var(--accent)">₹${b.total_paid.toLocaleString()}</div>
                        <div style="color:var(--text-tertiary);font-size:11px">${paxCount} traveler${paxCount>1?'s':''}</div>
                    </div>
                </div>
                <div style="margin-bottom:12px;padding:4px 8px;border-radius:8px;background:rgba(255,255,255,0.02)">${passengerRows}</div>
                <div class="d-flex justify-content-between align-items-center pt-2" style="border-top:1px solid rgba(255,255,255,0.06)">
                    <div style="color:var(--text-tertiary);font-size:12px"><i class="fas fa-calendar me-1"></i>${b.dep_time} · Booked ${b.booked_on}</div>
                    <div class="d-flex gap-2">
                        <a href="/booking-confirmation/${b.primary_id}" class="btn btn-sm btn-ghost" style="padding:5px 14px;font-size:12px">View</a>
                        ${canCancelAll ? `<button onclick="cancelGroupBooking(['${cancellableIds.join("','")}'])" class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.15);padding:5px 14px;font-size:12px;border-radius:6px">Cancel All Remaining</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error(e); c.innerHTML = '<p style="color:#ef4444">Failed to load bookings</p>'; }
}

async function cancelGroupBooking(ids) {
    if (!confirm(`Cancel ${ids.length} booking(s)? This cannot be undone.`)) return;
    for (const id of ids) {
        try {
            await fetch('/api/bookings/cancel', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookingId:id})});
        } catch(e) {}
    }
    showToast('Booking(s) cancelled','success');
    loadMyBookings();
}

async function cancelBooking(id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
        const res = await fetch('/api/bookings/cancel', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookingId:id})});
        const r = await res.json();
        if (r.success) { showToast('Booking cancelled','success'); loadMyBookings(); }
        else showToast(r.message,'error');
    } catch(e) { showToast('Failed to cancel','error'); }
}

// ============ CONTACT ============
async function submitContact(event) {
    event.preventDefault();
    const name = document.getElementById('contactName')?.value;
    const email = document.getElementById('contactEmail')?.value;
    const msg = document.getElementById('contactMessage')?.value;
    try {
        const res = await fetch('/api/contact', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,message:msg})});
        const r = await res.json();
        if (r.success) { showToast(r.message,'success'); document.getElementById('contactForm')?.reset(); }
    } catch(e) { showToast('Failed to send','error'); }
}

// ============ REGISTER ============
async function registerPassenger(event) {
    if (event) event.preventDefault();
    const fname = document.getElementById('firstName').value;
    const lname = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    try {
        const res = await fetch('/api/passengers/register', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName:fname,lastName:lname,email:email})});
        const result = await res.json();
        if (result.success) { showToast(result.message,'success'); document.getElementById('registerForm')?.reset(); }
        else showToast(result.message,'error');
    } catch(e) { showToast('Registration error','error'); }
}

// ============ DASHBOARD ============
let busiestRoutesChartInst = null, dominantAirlinesChartInst = null;
if (typeof Chart !== 'undefined') { Chart.defaults.color = '#64748b'; Chart.defaults.font.family = "'Inter', sans-serif"; }

async function loadBusiestRoutes() {
    try {
        const res = await fetch(`${API_BASE}/busiest-routes`); const data = await res.json();
        const ctx = document.getElementById('busiestRoutesChart');
        if (ctx) {
            if (busiestRoutesChartInst) busiestRoutesChartInst.destroy();
            busiestRoutesChartInst = new Chart(ctx, { type:'bar', data:{labels:data.map(i=>`${i.departure} → ${i.arrival}`),datasets:[{label:'Passengers',data:data.map(i=>i.count),backgroundColor:'rgba(59,130,246,0.8)',borderRadius:6,borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(0,0,0,0.05)'},beginAtZero:true},x:{grid:{display:false}}}} });
        }
    } catch(e) { console.error(e); }
}

async function loadHighValueCustomers() {
    try {
        const res = await fetch(`${API_BASE}/high-value-customers`); const data = await res.json();
        const tbody = document.getElementById('highValueCustomersTableBody');
        if (tbody) tbody.innerHTML = data.map(c => `<tr><td class="fw-medium">${c.name}</td><td class="text-end text-success fw-bold">₹${c.spent.toFixed(2)}</td></tr>`).join('');
    } catch(e) {}
}

async function loadDominantAirlines() {
    try {
        const res = await fetch(`${API_BASE}/dominant-airlines`); const data = await res.json();
        const ctx = document.getElementById('dominantAirlinesChart');
        if (ctx) {
            if (dominantAirlinesChartInst) dominantAirlinesChartInst.destroy();
            dominantAirlinesChartInst = new Chart(ctx, { type:'doughnut', data:{labels:data.map(i=>`${i.airline} (${i.city})`),datasets:[{data:data.map(i=>i.flights),backgroundColor:['rgba(59,130,246,0.8)','rgba(139,92,246,0.8)','rgba(6,182,212,0.8)','rgba(244,63,94,0.8)','rgba(16,185,129,0.8)'],borderWidth:2,borderColor:'#fff'}]}, options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{position:'bottom',labels:{padding:20,usePointStyle:true}}}} });
        }
    } catch(e) {}
}

async function loadOccupancy() {
    try {
        const res = await fetch(`${API_BASE}/occupancy`); const data = await res.json();
        const c = document.getElementById('occupancyContainer');
        if (c) c.innerHTML = data.map(i => `<div class="mb-3"><div class="d-flex justify-content-between text-muted small mb-1"><span>Flight ${i.flight_id} - ${i.airline}</span><span class="fw-bold">${i.occupancy}%</span></div><div class="progress" style="height:6px"><div class="progress-bar" style="width:${i.occupancy}%;background:var(--accent-red)"></div></div></div>`).join('');
    } catch(e) {}
}

async function loadRecentTraffic() {
    try {
        const res = await fetch(`${API_BASE}/recent-traffic`); const data = await res.json();
        const c = document.getElementById('recentTrafficContainer');
        if (c) c.innerHTML = data.length ? data.map(i => `<div class="border-bottom mb-3 pb-2" style="border-color:rgba(0,0,0,0.08)!important"><div class="d-flex justify-content-between"><strong style="color:#0f172a">${i.passenger}</strong><small class="text-muted"><i class="far fa-clock me-1"></i>${new Date(i.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div><div class="text-muted small mt-1"><i class="fas fa-plane-departure me-1" style="color:var(--accent)"></i>${i.airline}</div></div>`).join('') : '<p class="text-muted text-center py-3">No recent activity</p>';
    } catch(e) {}
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('bookingForm')) initBookingPage();
    if (document.getElementById('flight-results')) {
        const p = new URLSearchParams(window.location.search);
        if (p.has('dep')) {
            document.getElementById('departureCity').value = p.get('dep')||'';
            document.getElementById('arrivalCity').value = p.get('arr')||'';
            document.getElementById('departureDate').value = p.get('date')||'';
            fetchFlights();
        }
    }
    if (document.getElementById('myBookingsList')) loadMyBookings();
    if (document.getElementById('dashboard-page')) {
        const loadAll = () => { loadBusiestRoutes(); loadHighValueCustomers(); loadDominantAirlines(); loadOccupancy(); loadRecentTraffic(); };
        loadAll(); setInterval(loadAll, 5000);
    }
});
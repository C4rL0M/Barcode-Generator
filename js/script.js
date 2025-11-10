const $ = selector => document.querySelector(selector);
const canvas = $('#bcCanvas');
const inputText = $('#inputText');
const formatSelect = $('#formatSelect');
const scaleInput = $('#scale');
const includeText = $('#includeText');
const fgInput = $('#fg');
const bgInput = $('#bg');
const downloadBtn = $('#downloadBtn');
const copyBtn = $('#copyBtn');
const statusEl = $('#status');
const fgSwatch = $('#fgSwatch');
const bgSwatch = $('#bgSwatch');
const colorSample = $('#colorSample');

let renderTimer = null;
const debounce = (fn, wait=300) => (...args) => {
	clearTimeout(renderTimer);
	renderTimer = setTimeout(()=> fn(...args), wait);
};

const examples = {
	code128: 'Hello-123',
	code39: 'CODE39',
	ean13: '012345678901',
	ean8: '96385074',
	upca: '12345678901',
	interleaved2of5: '1234567890',
	qrcode: 'https://example.com',
	pdf417: 'PDF417 sample text',
	datamatrix: 'DMATRIX'
};

function setPlaceholderForFormat(){
	const v = formatSelect.value;
	inputText.placeholder = examples[v] || 'Enter text or digits';
}

function validateForFormat(format, text){
	if(!text) return {ok:false, msg:'Please enter text to encode.'};
	if(format === 'ean13'){
		const digits = text.replace(/\D/g,'');
		if(digits.length !== 12 && digits.length !== 13){
			return {ok:false, msg:'EAN-13 requires 12 or 13 digits (12 digits will auto-calc check digit).'};
		}
	}
	if(format === 'upca'){
		const digits = text.replace(/\D/g,'');
		if(digits.length !== 11 && digits.length !== 12){
			return {ok:false, msg:'UPC-A requires 11 or 12 digits.'};
		}
	}
	return {ok:true};
}

function renderBarcode(){
	const text = inputText.value.trim() || inputText.placeholder || '';
	const format = formatSelect.value;
	const scale = parseInt(scaleInput.value, 10) || 3;
	const includetext = includeText.checked;
	const fg = fgInput.value.replace('#','');
	const bg = bgInput.value.replace('#','');

	const v = validateForFormat(format, text);
		if(!v.ok){
			showMessage(v.msg, 'error');
			return;
		}

		if (statusEl) { statusEl.className = 'status'; statusEl.innerHTML = ''; }

	try{
		bwipjs.toCanvas(canvas, {
			bcid: format,
			text: text,
			scale: scale,
			includetext: includetext,
			textxalign: 'center',
			backgroundcolor: bg,
			barcolor: fg,
			paddingheight: 10,
			paddingwidth: 10
		});
	}catch(err){
			console.error('bwip error', err);
			showMessage((err && err.message) ? err.message : 'Failed to render barcode.', 'error');
	}
}

const debouncedRender = debounce(renderBarcode, 220);

inputText.addEventListener('input', debouncedRender);
formatSelect.addEventListener('change', () => { setPlaceholderForFormat(); debouncedRender(); });
scaleInput.addEventListener('input', debouncedRender);
includeText.addEventListener('change', debouncedRender);
fgInput.addEventListener('input', debouncedRender);
bgInput.addEventListener('input', debouncedRender);

function updateColorUI(){
	try{
		if(fgSwatch && fgInput.value) fgSwatch.style.background = fgInput.value;
		if(bgSwatch && bgInput.value) bgSwatch.style.background = bgInput.value;
		if(colorSample){
			colorSample.style.background = bgInput.value || '#fff';
			colorSample.style.color = fgInput.value || '#000';
		}
	}catch(e){/* ignore UI update errors */}
}
fgInput.addEventListener('input', updateColorUI);
bgInput.addEventListener('input', updateColorUI);

downloadBtn.addEventListener('click', ()=>{
	try{
		const data = canvas.toDataURL('image/png');
		const a = document.createElement('a');
		a.href = data;
		a.download = `barcode-${formatSelect.value}.png`;
		document.body.appendChild(a);
		a.click();
		a.remove();
	}catch(err){
		console.error(err);
		showMessage('Unable to download image.', 'error');
	}
});

copyBtn.addEventListener('click', async ()=>{
	try{
		canvas.toBlob(async (blob)=>{
			if(!blob) { showMessage('Copy failed', 'error'); return; }
			try{
				const item = new ClipboardItem({'image/png': blob});
				await navigator.clipboard.write([item]);
				showMessage('Image copied to clipboard', 'success', 1600);
			}catch(e){
				console.warn('clipboard write failed', e);
				showMessage('Copy not supported in this browser', 'info', 2500);
			}
		});
	}catch(err){
		console.error(err);
		showMessage('Copy failed', 'error');
	}
});

setPlaceholderForFormat();
if(!inputText.value) inputText.value = examples[formatSelect.value] || '';
updateColorUI();
renderBarcode();

let msgTimer = null;
function showMessage(msg, type='info', timeout=4000){
	if(!statusEl) return;
	clearTimeout(msgTimer);
	statusEl.className = 'status show ' + (type || 'info');
	const icons = {
		error: '<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.29 3.86l-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.71-3.14l-7-12a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="0"/></svg>',
		success: '<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		info: '<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 12h1v4h1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="0"/></svg>'
	};
	statusEl.innerHTML = (icons[type] || icons.info) + '<span class="msg">' + msg + '</span>';

	if(type === 'error') return;
	msgTimer = setTimeout(()=>{
		statusEl.className = 'status';
		statusEl.innerHTML = '';
	}, timeout || 3000);
}


class ColorSchemeType
{
	HairLt_Swap = 0xFF8080;
	Hair_Swap = 0xFF0000;
	HairDk_Swap = 0x800000;
	Body1VL_Swap = 0xFFE0C0;
	Body1Lt_Swap = 0xFFC080;
	Body1_Swap = 0xFF8000;
	Body1Dk_Swap = 0x804000;
	Body1VD_Swap = 0x402000;
	Body1Acc_Swap = 0xFFC000;
	Body2VL_Swap = 0xFFFFC0;
	Body2Lt_Swap = 0xFFFF80;
	Body2_Swap = 0xFFFF00;
	Body2Dk_Swap = 0x808000;
	Body2VD_Swap = 0x404000;
	Body2Acc_Swap = 0xC0FF00;
	SpecialVL_Swap = 0xC0FFC0;
	SpecialLt_Swap = 0x80FF80;
	Special_Swap = 0x00FF00;
	SpecialDk_Swap = 0x008000;
	SpecialVD_Swap = 0x004000;
	SpecialAcc_Swap = 0x00FFC0;
	ClothVL_Swap = 0xC0C0FF;
	ClothLt_Swap = 0x8080FF;
	Cloth_Swap = 0x0000FF;
	ClothDk_Swap = 0x000080;
	WeaponVL_Swap = 0xFFC0FF;
	WeaponLt_Swap = 0xFF80FF;
	Weapon_Swap = 0xFF00FF;
	WeaponDk_Swap = 0x800080;
	WeaponAcc_Swap = 0xFF0080;

	generateXML()
	{
		let xml = '<ColorSchemeType>\n';
		for (let prop in this) if (typeof this[prop] != 'function') xml += '\t<' + prop + '>0x' + this[prop].toString(16).padStart(6, '0').toUpperCase() + '</' + prop + '>\n';
		xml += '</ColorSchemeType>';
		return xml;
	}

	loadXML(xml)
	{
		try
		{
			let parser = new DOMParser();
			let xmlDoc = parser.parseFromString(xml, 'text/xml');
			let xmlNode = xmlDoc.getElementsByTagName('ColorSchemeType')[0];
			if (!xmlNode) throw new Error('ColorSchemeType not found in XML');
			for (let prop in this)
			{
				if (typeof this[prop] != 'function')
				{
					let valueNode = xmlNode.getElementsByTagName(prop)[0];
					if (!valueNode || !valueNode.childNodes[0]) throw new Error(`Missing or invalid value for property ${prop}`);
					let value = valueNode.childNodes[0].nodeValue;
					let result = parseInt(value, 16);
					if (isNaN(result)) throw new Error(`Invalid value for property ${prop}`);
					else this[prop] = result;
				}
			}
		}
		catch (error)
		{
			console.error(`Failed to load XML: ${error.message}`);
			throw error;
		}
	}
}

function degrees(radians) { return radians * (180 / Math.PI); }

function rgbToHsv(r, g, b)
{
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const v = max / 255;
	let s;
	if (max > 0) s = 1 - min / max;
	else s = 0;
	let h;
	if (r === g && g === b) h = 0;
	else
	{
		h = Math.acos((r - g / 2 - b / 2) / Math.sqrt(r * r + g * g + b * b - r * g - r * b - g * b));
		h = degrees(h);
	}
	if (b > g) h = 360 - h;
	return [h, s * 255, v * 255];
}

function hsvToRgb(h, s, v)
{
	const max = v;
	const min = max * (1 - s / 255);
	const z = (max - min) * (1 - Math.abs((h / 60) % 2 - 1));
	let r, g, b;
	if (h >= 0 && h < 300)
	{
		switch (true)
		{
			case (h < 60):
			{
				r = max;
				g = z + min;
				b = min;
				break;
			}
			case (h < 120):
			{
				r = z + min;
				g = max;
				b = min;
				break;
			}
			case (h < 180):
			{
				r = min;
				g = max;
				b = z + min;
				break;
			}
			case (h < 240):
			{
				r = min;
				g = z + min;
				b = max;
				break;
			}
			default:
			{
				r = z + min;
				g = min;
				b = max;
			}
		}
	}
	else
	{
	    r = max;
	    g = min;
	    b = z + min;
	}
	return [Math.round(r), Math.round(g), Math.round(b)];
}

function shadeColour(colour, shade)
{
	let hsv = rgbToHsv(colour >> 16, (colour >> 8) & 0xFF, colour & 0xFF);
	if (shade === 3)
	{
		hsv[0] = (hsv[0] + Math.floor(Math.random() * 60) - 30) % 360;
		hsv[1] = 255;
	}
	else
	{
		hsv[0] = (hsv[0] > 180 || hsv[0] === 0) ? (hsv[0] - 3 * shade) % 360 : (hsv[0] + 3 * shade) % 360;
		hsv[1] *= [2, Math.sqrt(2), 1, Math.sqrt(2) / 2, 0.5][shade + 2];
		hsv[2] *= Math.min([0.5, Math.sqrt(2) / 2, 1, Math.sqrt(2), 2][shade + 2], 255);
	}
	if (hsv[0] < 0) hsv[0] += 360;
	hsv[1] = Math.min(hsv[1], 255);
	hsv[2] = Math.min(hsv[2], 255);
	let rgb = hsvToRgb(hsv[0], hsv[1], hsv[2]);
	if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0) return 0x010101;
	else return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
}

let colour_scheme = new ColorSchemeType();

var editor = CodeMirror.fromTextArea(document.getElementById("xml-input"),
{
	lineNumbers: true,
	mode: "application/xml",
	htmlMode: true
});

let load_button = document.getElementById('load-button');
let generate_button = document.getElementById('generate-button');
let copy_button = document.getElementById('copy-button');
let error_message = document.getElementById('error-message');
let shade_button = document.getElementById('shade-button');

copy_button.addEventListener('click', () => { navigator.clipboard.writeText(editor.getValue()); });

generate_button.addEventListener('click', () =>
{
	editor.setValue(colour_scheme.generateXML());
	error_message.innerHTML = '';
});

load_button.addEventListener('click', () =>
{
	try { colour_scheme.loadXML(editor.getValue()); }
	catch (error)
	{
		error_message.innerHTML = `Error: ${error.message}`;
		return;
	}
	error_message.innerHTML = '';
	editor.setValue(colour_scheme.generateXML());

	let tds = document.getElementsByTagName('td');
	for (let td of tds)
	{
		let colour = colour_scheme[td.className];
		if (colour)
		{
			let input = td.firstChild;
			input.value = '#' + colour.toString(16).padStart(6, '0').toUpperCase();
		}
	}
});


shade_button.addEventListener('click', () =>
{
	let trs = document.getElementsByTagName('tr');
	let base_tr = null;
	for (let tr of trs) if (tr.className === 'Base-tr') base_tr = tr;
	for (let tr of trs) if (tr !== base_tr)
	{
		let tds = tr.getElementsByTagName('td');
		for (let td of tds)
		{
			if (td.firstChild && td.firstChild.tagName === 'INPUT')
			{
				let base_name = td.className.split(/(?=[A-Z])/)[0];
				let base_td = base_tr.getElementsByClassName(`${base_name}_Swap`)[0];
				let base_colour = base_td.firstChild.value;
				let shade = 0;
				const shades =
				{
					'VD': -2,
					'Dk': -1,
					'Lt': 1,
					'VL': 2,
					'Acc': 3
				};
				for (let key in shades)
				{
					if (td.className.includes(key))
					{
						shade = shades[key];
						break;
					}
				}
				let colour = shadeColour(parseInt(base_colour.slice(1), 16), shade);
				td.firstChild.value = '#' + colour.toString(16).padStart(6, '0').toUpperCase();
				colour_scheme[td.className] = colour;
			}
		}
	}
});

let inputs = document.getElementsByTagName('input');
for (let input of inputs) input.addEventListener('change', () =>
{
	let colorValue = parseInt(input.value.slice(1), 16);
	colour_scheme[input.parentNode.className] = colorValue !== 0 ? colorValue : 0x010101;
});

editor.setValue(colour_scheme.generateXML());
load_button.click();

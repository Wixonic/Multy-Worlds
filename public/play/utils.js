export const Storage = window.localStorage || window.sessionStorage || {
	data: {},

	getItem: (id) => Storage.data[id],
	setItem: (id,value) => Storage.data[id] = value
};

export const request = (datas={}) => {
	return new Promise((resolve,reject) => {
		const xhr = new XMLHttpRequest();

		for (let name of (datas.headers || [])) {
			xhr.setRequestHeader(name,datas.headers[name]);
		}

		xhr.responseType = datas.type || "text";

		xhr.open(datas.method || "GET",typeof datas === "string" ? datas : datas.url,true);

		xhr.onload = () => resolve(xhr.response);
		xhr.onerror = () => reject(xhr.status,xhr.statusText);
		xhr.send(datas.body);
	});
};
const DB_URL_BASE = 'https://lines-c8c9f.firebaseio.com/';

function Rest(base) {
  const postfix = '.json';
  
  const href = path => base + path + postfix;
  const request = (path = '', init = {}) => fetch(href(path), init).then(response => response.json());
  const send = (path = '', data = {}, init = {}) => fetch(href(path), {
    body: JSON.stringify(data),
    headers: {
      'content-type': 'application/json'
    },
    ...init
  }).then(response => response.json());
  
  return {
    get: (path = '', init = {}) => request(path, init),
    del: (path = '', init = {}) => request(path, { ...init, method: 'DELETE' }),
    // replace node
    put: (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'PUT' }),
    // update node
    patch: (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'PATCH' }),
    // creale new list entry with auto-generated timestamp-based key
    post:  (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'POST' })
  }
};

const db = new Rest(DB_URL_BASE);

//db.post('lines', {fizz: 'buzz'}).then(() => db.get('lines')).then(console.log);
//db.get('lines').then(console.log);
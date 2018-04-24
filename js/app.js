const app = ({ getLinesJSON, linesStorage }) => {
  const lines = linesStorage();
//  lines.read().then(console.log);
  
  // cleanup
//  lines.update(null, { foobar: true });
  
  // json data import
//  getLinesJSON()
//    .then(json => json.slice(0, 2))
//    .then(lines.importJSON)
//    .then(console.log);
};

const firebaseStorage = (state) => {
  const { host } = state;
  
  const postfix = '.json';  
  const url = path => host + path + postfix;
  const toJson = data => data.json();
  const extractId = ({ name: id }) => id;
  
  const request = (path = '', init = {}) => fetch(url(path), init).then(toJson);
  const send = (path = '', data = {}, init = {}) => fetch(url(path), {
    body: JSON.stringify(data),
    headers: {
      'content-type': 'application/json'
    },
    ...init
  }).then(toJson).then(extractId);
  
  return {
    get: (path = '', init = {}) => request(path, init),
    del: (path = '', init = {}) => request(path, { ...init, method: 'DELETE' }),
    // replace node
    put: (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'PUT' }),
    // update node
    patch: (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'PATCH' }),
    // creale new list entry with auto-generated timestamp-based key
    post:  (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'POST' })
  };
};

const crudStorage = (state) => {
  const { basepath } = state;
  const { get, del, put, patch, post } = firebaseStorage({ host: 'https://lines-c8c9f.firebaseio.com/' });
  const path = id => basepath + (id ? `/${id}` : '');
  return {
    create: data => post(path(), data),
    read: id => get(path(id)),
    update: (id, data) => id ? patch(path(id), data) : put(path(), data),
    // TODO
    delere: id => Promise.resolve(id),
  };
};

const linesStorage = () => {
  const { create, read, update, delere } = crudStorage({ basepath: 'lines' });
  const importJSON = json => Array.isArray(json) ? saveLines(json) : saveLine(json);
  const instance = {
    create,
    read,
    update,
    delere,
    importJSON
  };
  
  const saveLines = data => Promise.all( data.map(saveLine) );
  
  const saveLine = data => {
    if (Object.keys(data).length === 1) {
      return create(data);
    }
    
    let metaPromises = saveMeta(data);
    let metaData = null;
    let lineId = null;
    
    return Promise.all(metaPromises)
      .then(meta => {
        metaData = meta.reduce((mix, chunk) => ({ ...mix, ...chunk }), {});
        return create({ ...data, ...metaData });
      })
      .then(id => {
        lineId = id;
        metaPromises = updateMeta(lineId, metaData);
        return Promise.all(metaPromises);
      })
      .then(() => lineId);
  };

  // 2-way connections map
  const reverseKeysMap = {
    definitions: 'terms',
    examples: 'subjects',
    tags: 'links'
  };

  const saveMeta = data => Object.keys(data)
    .map(key => key !== 'value' ? saveLines(data[key]).then(ids => ({
      [key]: ids.reduce((hash, id) => ({ ...hash, [id]: true }), {})
    })) : Promise.resolve());
  
  const updateMeta = (lineId, metaData) => Object.keys(metaData).map(key => Promise.all(
    Object.keys(metaData[key]).map(id => update(id, {
      [reverseKeysMap[key]]: {
        [lineId]: true
      }
    }))
  ));
  
  return instance;
};

const getLinesJSON = () => fetch('data/lines.json' + location.search).then(data => data.json());

app({ getLinesJSON, linesStorage });
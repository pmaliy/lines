const app = ({ linesStorage, getLinesJSON }) => {
  const lines = linesStorage();
  //  lines.read().then(console.log);

  // cleanup
//   lines.update(null, true);

  // json data import
//   getLinesJSON('test/sameTag')
//    .then(lines.importJSON)
//    .then(console.log);
};

const getLinesJSON = filename => fetch(`data/${filename || 'lines'}.json` + location.search).then(data => data.json());

app({ linesStorage, getLinesJSON });
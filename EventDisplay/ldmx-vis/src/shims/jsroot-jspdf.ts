function unsupported() {
  throw new Error('PDF export is not supported in the lightweight LDMX React viewer.');
}

export class jsPDF {
  constructor() {
    unsupported();
  }
}

export default {
  jsPDF
};

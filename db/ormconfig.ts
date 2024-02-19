import { DataSource } from 'typeorm';

import getDbConfig from '../src/config/db.config';

export default new DataSource(getDbConfig());

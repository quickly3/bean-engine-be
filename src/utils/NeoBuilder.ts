import { Neo4jService } from 'nest-neo4j';
import * as _ from 'lodash';
import * as fs from 'fs';
import { jsonToNeoString } from 'src/service/utils';
import { CreateRelationsParamsDto, CreateRelationsValuesDto } from './neo.dto';

export class NeoQueryBuilder {
  servive: Neo4jService;
  constructor(servive) {
    this.servive = servive;
  }
  async createByObjet(name, object) {
    const propertery = JSON.stringify(object).replace(/"([^"]+)":/g, '$1:');
    const cql = `CREATE(o:${name} ${propertery})`;
    let resp;
    try {
      resp = await this.servive.write(cql);
    } catch (error) {
      console.error(cql);
      console.error(error);
    }
    return resp;
  }

  async createByObjets(name, props) {
    const cql = `UNWIND $props AS properties
    CREATE (n:${name} {})
    SET n = properties`;

    try {
      const resp = await this.servive.write(cql, { props });
    } catch (error) {
      console.error(error);
    }
  }

  async createUniqueKey(type, field) {
    const testObj = {};
    testObj[field] = 'test';
    await this.createByObjet(type, testObj);
    const cql = `CREATE CONSTRAINT FOR (n:${type}) REQUIRE (n.${field}) IS UNIQUE`;
    let resp;
    try {
      resp = await this.servive.write(cql);
    } catch (error) {
      console.error(cql);
      console.error(error);
    }
    await this.deleteByObject(type, testObj);
    return resp;
  }

  async createRelationsByObjets(
    p: CreateRelationsParamsDto,
    values: CreateRelationsValuesDto[],
    unique = true,
  ) {
    const model = unique ? 'MERGE' : 'CREATE';
    const cql = `UNWIND $values AS v
    MATCH (a:${p.a_type}),(b:${p.b_type})
    WHERE a.${p.a_field} = v.a_value AND b.${p.b_field} = v.b_value
    ${model} (a)-[r:${p.r_type}]->(b)`;

    try {
      const resp = await this.servive.write(cql, { values });
    } catch (error) {
      console.log(cql);
      console.error(error);
    }
  }

  async addUniqueKey(name, field) {
    const cql = `CREATE CONSTRAINT FOR (n:${name}) REQUIRE (n.${field}) IS UNIQUE`;
    let resp;
    try {
      resp = await this.servive.write(cql);
    } catch (error) {
      console.error(error);
    }
    return resp;
  }

  async showConstraints() {
    const cql = `SHOW CONSTRAINTS`;
    let resp;
    try {
      resp = await this.servive.write(cql);
    } catch (error) {
      console.error(error);
    }

    const constraints = _.get(resp, 'records');

    const _constraints = constraints.map((record) => {
      const obj = {};
      for (const i in record.keys) {
        const key = record.keys[i];
        const field = record._fields[i];
        obj[key] = field;
      }
      return obj;
    });

    return _constraints;
  }

  async dropConstraint(name) {
    const cql = `DROP CONSTRAINT ${name}`;
    let resp;
    try {
      resp = await this.servive.write(cql);
    } catch (error) {
      console.error(cql);
      console.error(error);
    }
    return resp;
  }

  async rawQuery(cql, params) {
    let resp;
    try {
      resp = await this.servive.write(cql, params);
    } catch (error) {
      console.error(cql);
      console.error(error);
    }
    return resp;
  }

  parseQuery(resp) {
    if (!resp) {
      return null;
    }
    const parseResp = resp.records.map((r) => {
      const obj = {};
      for (const i in r.keys) {
        obj[r.keys[i]] = r._fields[i];
      }
      return obj;
    });
    return parseResp;
  }

  async rawRead(cql, params = undefined) {
    let resp;
    try {
      resp = await this.servive.read(cql, params);
    } catch (error) {
      console.error(cql);
      console.error(error);
    }
    return this.parseQuery(resp);
  }

  async dropAllConstraints() {
    const resp = await this.showConstraints();
    for (const constraint of resp) {
      await this.dropConstraint(constraint.name);
    }
  }

  async deleteByObject(name, object) {
    const propertery = JSON.stringify(object).replace(/"([^"]+)":/g, '$1:');
    const cql = `MATCH (n:${name} ${propertery}) DELETE n`;
    let resp;
    try {
      resp = await this.servive.write(cql);
    } catch (error) {
      console.error(error);
    }
    return resp;
  }

  async truncate() {
    const cqls = [
      `match (a) -[r] -> () 
        delete a, r`,
      `match (n)
       delete n`,
    ];
    for (const cql of cqls) {
      try {
        await this.servive.write(cql);
      } catch (error) {
        console.log(cql);
        console.error(error);
      }
    }
  }

  async truncateDB(name) {
    const cqls = [
      `DROP DATABASE ${name} [IF  EXISTS]`,
      `CREATE DATABASE ${name} [IF NOT EXISTS]`,
    ];
    for (const cql of cqls) {
      try {
        await this.servive.write(cql);
      } catch (error) {
        console.log(cql);
        console.error(error);
      }
    }
  }

  async dropByType(type) {
    const cqls = [
      `match (a:${type}) -[r] - () 
        delete a, r`,
      `match (n:${type})
       delete n`,
    ];
    for (const cql of cqls) {
      try {
        await this.servive.write(cql);
      } catch (error) {
        console.log(cql);
        console.error(error);
      }
    }
  }

  async dropRelationByType(type) {
    const cqls = [
      `match () -[r:${type}] -> () 
        delete r`,
    ];
    for (const cql of cqls) {
      try {
        await this.servive.write(cql);
      } catch (error) {
        console.log(cql);
        console.error(error);
      }
    }
  }
}

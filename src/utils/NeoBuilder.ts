import { Neo4jService } from 'nest-neo4j';
import * as _ from 'lodash';
import * as fs from 'fs';
import { jsonToNeoString } from 'src/service/utils';

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

  async createByObjets(name, objects) {
    let cql = '';
    for (const i in objects) {
      const object = objects[i];
      const propertery = JSON.stringify(object).replace(/"([^"]+)":/g, '$1:');
      cql += `CREATE(o${i}:${name} ${propertery})\n`;
    }
    let resp;
    try {
      resp = await this.servive.write(cql);
    } catch (error) {
      console.error(error);
    }
    return resp;
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

  async createRelationsByObjets(r_type, relations) {
    let cql = '';
    let match_cql = '';
    let create_cql = '';

    for (const i in relations) {
      const object = relations[i];

      const type_a = object.a.type;
      const field_a = object.a.field;
      const value_a = object.a.value;

      const type_b = object.b.type;
      const field_b = object.b.field;
      const value_b = object.b.value;

      if (!value_a) {
        continue;
      }

      if (!value_b) {
        continue;
      }

      match_cql += `MATCH (a${i}:${type_a}),(b${i}:${type_b})
      WHERE a${i}.${field_a} = "${value_a}" AND b${i}.${field_b} = "${value_b}"\n`;
      create_cql += `CREATE (a${i})-[r${i}:${r_type}]->(b${i})\n`;
    }
    cql = match_cql + create_cql;
    let resp;
    try {
      resp = await this.servive.write(cql);
    } catch (error) {
      console.error(error);
    }
    return resp;
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
      `match (a:${type}) -[r] -> () 
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
}

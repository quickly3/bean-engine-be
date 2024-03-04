import * as _ from 'lodash';
import { source_mapping } from 'src/enum/enum';
import { escapeElasticReservedChars } from 'src/utils/es';

export const parseQueryString = (payload) => {
  let keywords = _.get(payload, 'keywords', '*');
  const tag = _.get(payload, 'tag', 'all');
  const source = _.get(payload, 'source', 'all').toLowerCase();
  const startDate = _.get(payload, 'startDate', '');
  const endDate = _.get(payload, 'endDate', '');
  const author = _.get(payload, 'author', '');
  const selectTags = _.get(payload, 'selectTags', []);
  const selectCategories = _.get(payload, 'selectCategories', []);
  const collect_count = _.get(payload, 'collect_count', null);
  const comment_count = _.get(payload, 'comment_count', null);
  const digg_count = _.get(payload, 'digg_count', null);
  const view_count = _.get(payload, 'view_count', null);
  const and_operator = _.get(payload, 'and_operator', false);

  let query_string;
  if (keywords == '*' || !keywords) {
    query_string = '*:*';
  } else {
    keywords = escapeElasticReservedChars(keywords);
    query_string = `(title:(${keywords}) OR title:"${keywords}" OR summary:(${keywords}) OR summary:"${keywords}")`;
  }

  if (selectTags.length) {
    const selectTagsStr = selectTags.map((tag) => '"' + tag + '"').join(' || ');
    query_string = query_string + ' && tag:(' + selectTagsStr + ')';
  }

  if (selectCategories.length) {
    const selectCategoriesStr = selectCategories
      .map((tag) => '"' + tag + '"')
      .join(' || ');
    query_string = query_string + ' && category:(' + selectCategoriesStr + ')';
  }

  if (tag != 'all') {
    query_string = query_string + ' && tag:' + tag;
  }

  if (source != 'all') {
    query_string = query_string + ' && source:' + source;
  }

  if (author != '') {
    query_string =
      query_string + ' && (author:' + author + ' OR author:*' + author + '*)';
  }

  if (startDate.trim() !== '') {
    query_string = query_string + ' && created_at:[' + startDate + ' TO *]';
  }

  if (endDate.trim() !== '') {
    query_string = query_string + ' && created_at:[* TO ' + endDate + '}';
  }

  if (collect_count !== null) {
    query_string =
      query_string + ' && collect_count:[' + collect_count + ' TO *}';
  }

  if (comment_count !== null) {
    query_string =
      query_string + ' && comment_count:[' + comment_count + ' TO *}';
  }

  if (digg_count !== null) {
    query_string = query_string + ' && digg_count:[' + digg_count + ' TO *}';
  }

  if (view_count !== null) {
    query_string = query_string + ' && view_count:[' + view_count + ' TO *}';
  }

  const query = {
    query_string: {
      query: query_string,
    },
  };

  if (and_operator) {
    query['query_string']['default_operator'] = 'AND';
  }

  return query;
};

export const parseAuthorQueryString = (payload) => {
  const keywords = _.get(payload, 'keywords', '*');
  const source = _.get(payload, 'source', 'all');

  let query_string = '*:*';
  if (keywords.trim() !== '') {
    query_string = `user_name:\"${keywords}\" || user_name:*${keywords}* `;
  }

  if (source !== 'all') {
    query_string += ` && source:${source} `;
  }

  const query = {
    query_string: {
      query: query_string,
    },
  };
  return query;
};

export const jsonToNeoString = (object) => {
  return JSON.stringify(object).replace(/"([^"]+)":/g, '$1:');
};

export function getSourceName(source) {
  const _source = _.findLast(source_mapping, (s) => s.source === source);
  return _source.text;
}

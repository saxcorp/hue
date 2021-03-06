// Licensed to Cloudera, Inc. under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  Cloudera, Inc. licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var SqlAutocompleter3 = (function () {

  // Keyword weights come from the parser
  var DEFAULT_WEIGHTS = {
    POPULAR_AGGREGATE: 1500,
    POPULAR_GROUP_BY: 1400,
    POPULAR_ORDER_BY: 1300,
    POPULAR_FILTER: 1200,
    POPULAR_ACTIVE_JOIN: 1200,
    POPULAR_JOIN_CONDITION: 1100,
    COLUMN: 1000,
    SAMPLE: 900,
    IDENTIFIER: 800,
    CTE: 700,
    TABLE: 600,
    DATABASE: 500,
    UDF: 400,
    HDFS: 300,
    VIRTUAL_COLUMN: 200,
    COLREF_KEYWORD: 100,
    VARIABLE: 50,
    JOIN: -1
  };

  var hiveReservedKeywords = {
    ALL: true, ALTER: true, AND: true, ARRAY: true, AS: true, AUTHORIZATION: true, BETWEEN: true, BIGINT: true, BINARY: true, BOOLEAN: true, BOTH: true, BY: true, CASE: true, CAST: true,
    CHAR: true, COLUMN: true, CONF: true, CREATE: true, CROSS: true, CUBE: true, CURRENT: true, CURRENT_DATE: true, CURRENT_TIMESTAMP: true, CURSOR: true,
    DATABASE: true, DATE: true, DECIMAL: true, DELETE: true, DESCRIBE: true, DISTINCT: true, DOUBLE: true, DROP: true, ELSE: true, END: true, EXCHANGE: true, EXISTS: true,
    EXTENDED: true, EXTERNAL: true, FALSE: true, FETCH: true, FLOAT: true, FOLLOWING: true, FOR: true, FROM: true, FULL: true, FUNCTION: true, GRANT: true, GROUP: true,
    GROUPING: true, HAVING: true, IF: true, IMPORT: true, IN: true, INNER: true, INSERT: true, INT: true, INTERSECT: true, INTERVAL: true, INTO: true, IS: true, JOIN: true, LATERAL: true,
    LEFT: true, LESS: true, LIKE: true, LOCAL: true, MACRO: true, MAP: true, MORE: true, NONE: true, NOT: true, NULL: true, OF: true, ON: true, OR: true, ORDER: true, OUT: true, OUTER: true, OVER: true,
    PARTIALSCAN: true, PARTITION: true, PERCENT: true, PRECEDING: true, PRESERVE: true, PROCEDURE: true, RANGE: true, READS: true, REDUCE: true,
    REGEXP: true, REVOKE: true, RIGHT: true, RLIKE: true, ROLLUP: true, ROW: true, ROWS: true,
    SELECT: true, SET: true, SMALLINT: true, TABLE: true, TABLESAMPLE: true, THEN: true, TIMESTAMP: true, TO: true, TRANSFORM: true, TRIGGER: true, TRUE: true,
    TRUNCATE: true, UNBOUNDED: true, UNION: true, UNIQUEJOIN: true, UPDATE: true, USER: true, USING: true, VALUES: true, VARCHAR: true, WHEN: true, WHERE: true,
    WINDOW: true, WITH: true
  };

  var extraHiveReservedKeywords = {
    ASC: true, CLUSTER: true, DESC: true, DISTRIBUTE: true, FORMATTED: true, FUNCTION: true, INDEX: true, INDEXES: true, LIMIT: true, LOCK: true, SCHEMA: true, SORT: true
  };

  var impalaReservedKeywords = {
    ADD: true, AGGREGATE: true, ALL: true, ALTER: true, AND: true, API_VERSION: true, AS: true, ASC: true, AVRO: true, BETWEEN: true, BIGINT: true, BINARY: true, BOOLEAN: true, BY: true, CACHED: true, CASE: true, CAST: true, CHANGE: true, CHAR: true, CLASS: true, CLOSE_FN: true,
    COLUMN: true, COLUMNS: true, COMMENT: true, COMPUTE: true, CREATE: true, CROSS: true, DATA: true, DATABASE: true, DATABASES: true, DATE: true, DATETIME: true, DECIMAL: true, DELIMITED: true, DESC: true, DESCRIBE: true, DISTINCT: true, DIV: true, DOUBLE: true, DROP: true, ELSE: true, END: true,
    ESCAPED: true, EXISTS: true, EXPLAIN: true, EXTERNAL: true, FALSE: true, FIELDS: true, FILEFORMAT: true, FINALIZE_FN: true, FIRST: true, FLOAT: true, FORMAT: true, FORMATTED: true, FROM: true, FULL: true, FUNCTION: true, FUNCTIONS: true, GROUP: true, HAVING: true, IF: true, IN: true, INCREMENTAL: true,
    INIT_FN: true, INNER: true, INPATH: true, INSERT: true, INT: true, INTEGER: true, INTERMEDIATE: true, INTERVAL: true, INTO: true, INVALIDATE: true, IS: true, JOIN: true, LAST: true, LEFT: true, LIKE: true, LIMIT: true, LINES: true, LOAD: true, LOCATION: true, MERGE_FN: true, METADATA: true,
    NOT: true, NULL: true, NULLS: true, OFFSET: true, ON: true, OR: true, ORDER: true, OUTER: true, OVERWRITE: true, PARQUET: true, PARQUETFILE: true, PARTITION: true, PARTITIONED: true, PARTITIONS: true, PREPARE_FN: true, PRODUCED: true, RCFILE: true, REAL: true, REFRESH: true, REGEXP: true, RENAME: true,
    REPLACE: true, RETURNS: true, RIGHT: true, RLIKE: true, ROW: true, SCHEMA: true, SCHEMAS: true, SELECT: true, SEMI: true, SEQUENCEFILE: true, SERDEPROPERTIES: true, SERIALIZE_FN: true, SET: true, SHOW: true, SMALLINT: true, STATS: true, STORED: true, STRAIGHT_JOIN: true, STRING: true, SYMBOL: true, TABLE: true,
    TABLES: true, TBLPROPERTIES: true, TERMINATED: true, TEXTFILE: true, THEN: true, TIMESTAMP: true, TINYINT: true, TO: true, TRUE: true, UNCACHED: true, UNION: true, UPDATE_FN: true, USE: true, USING: true, VALUES: true, VIEW: true, WHEN: true, WHERE: true, WITH: true,
  };

  /**
   *
   * @param options
   * @constructor
   */
  function Suggestions (options) {
    var self = this;
    self.apiHelper = ApiHelper.getInstance();
    self.snippet = options.snippet;
    self.editor = options.editor;

    // TODO: Have one array with all and add categories to each entry instead.
    // It's probably more likely that the user will be happy with all categories instead of filtering.
    self.keywords = ko.observableArray();
    self.identifiers = ko.observableArray();
    self.columnAliases = ko.observableArray();
    self.commonTableExpressions = ko.observableArray();
    self.functions = ko.observableArray();
    self.databases = ko.observableArray();
    self.tables = ko.observableArray();
    self.columns = ko.observableArray();
    self.values = ko.observableArray();
    self.paths = ko.observableArray();

    self.joins = ko.observableArray();
    self.joinConditions = ko.observableArray();
    self.aggregateFunctions = ko.observableArray();
    self.groupBys = ko.observableArray();
    self.orderBys = ko.observableArray();

    self.loadingKeywords = ko.observable(false);
    self.loadingFunctions = ko.observable(false);
    self.loadingDatabases = ko.observable(false);
    self.loadingTables = ko.observable(false);
    self.loadingColumns = ko.observable(false);
    self.loadingValues = ko.observable(false);
    self.loadingPaths = ko.observable(false);

    self.loadingJoins = ko.observable(false);
    self.loadingJoinConditions = ko.observable(false);
    self.loadingAggregateFunctions = ko.observable(false);
    self.loadingGroupBys = ko.observable(false);
    self.loadingOrderBys = ko.observable(false);

    self.filter = ko.observable();

    self.filtered = ko.pureComputed(function () {
      var result = self.keywords().concat(self.identifiers(), self.columnAliases(), self.commonTableExpressions(),
          self.functions(), self.databases(), self.tables(), self.columns(), self.values(), self.paths(), self.joins(),
          self.joinConditions(), self.aggregateFunctions(), self.groupBys(), self.orderBys());

      if (self.filter()) {
        var lowerCaseFilter = self.filter().toLowerCase();
        result = result.filter(function (suggestion) {
          // TODO: Extend with fuzzy matches
          var foundIndex = suggestion.value.toLowerCase().indexOf(lowerCaseFilter);
          if (foundIndex === -1) {
            return false;
          }
          if (foundIndex === 0) {
            suggestion.filterWeight = 2;
          } else if (foundIndex > 0) {
            suggestion.filterWeight = 1;
          }
          suggestion.matchIndex = foundIndex;
          suggestion.matchLength = self.filter().length;
          return true;
        });
      }
      result.sort(function (a, b) {
        if (self.filter()) {
          if (typeof a.filterWeight !== 'undefined' && typeof b.filterWeight !== 'undefined' && b.filterWeight !== a.filterWeight) {
            return b.filterWeight - a.filterWeight;
          }
          if (typeof a.filterWeight !== 'undefined' && typeof b.filterWeight === 'undefined') {
            return -1;
          }
          if (typeof a.filterWeight === 'undefined' && typeof b.filterWeight !== 'undefined') {
            return 1;
          }
        }
        if (typeof a.weight !== 'undefined' && typeof b.weight !== 'undefined' && b.weight !== a.weight) {
          return b.weight - a.weight;
        }
        if (typeof a.weight !== 'undefined' && typeof b.weight === 'undefined') {
          return -1;
        }
        if (typeof a.weight === 'undefined' && typeof b.weight !== 'undefined') {
          return 1;
        }
        return a.value.localeCompare(b.value);
      });
      return result;
    });
  }

  Suggestions.prototype.backTickIfNeeded = function (text) {
    var self = this;
    if (text.indexOf('`') === 0) {
      return text;
    }
    var upperText = text.toUpperCase();
    if (self.snippet.type() === 'hive' && (hiveReservedKeywords[upperText] || extraHiveReservedKeywords[upperText])) {
      return '`' + text + '`';
    } else if (self.snippet.type() === 'impala' && impalaReservedKeywords[upperText]) {
      return '`' + text + '`';
    } else if (impalaReservedKeywords[upperText] || hiveReservedKeywords[upperText] || extraHiveReservedKeywords[upperText]) {
      return '`' + text + '`';
    } else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(text)) {
      return '`' + text + '`';
    }
    return text;
  };

  Suggestions.prototype.update = function (parseResult) {
    var self = this;
    self.activeDatabase = parseResult.useDatabase || self.snippet.database();
    self.parseResult = parseResult;

    self.keywords([]);
    self.identifiers([]);
    self.columnAliases([]);
    self.commonTableExpressions([]);
    self.functions([]);
    self.databases([]);
    self.tables([]);
    self.columns([]);
    self.values([]);
    self.paths([]);

    self.joins([]);
    self.joinConditions([]);
    self.aggregateFunctions([]);
    self.groupBys([]);
    self.orderBys([]);

    self.loadingKeywords(false);
    self.loadingFunctions(false);
    self.loadingDatabases(false);
    self.loadingTables(false);
    self.loadingColumns(false);
    self.loadingValues(false);
    self.loadingPaths(false);

    self.loadingJoins(false);
    self.loadingJoinConditions(false);
    self.loadingAggregateFunctions(false);
    self.loadingGroupBys(false);
    self.loadingOrderBys(false);

    self.filter('');

    var colRefDeferred = self.handleColumnReference();
    var databasesDeferred = self.loadDatabases();

    self.handleKeywords(colRefDeferred);
    self.handleIdentifiers();
    self.handleColumnAliases();
    self.handleCommonTableExpressions();
    self.handleFunctions(colRefDeferred);
    self.handleDatabases(databasesDeferred);
    var tablesDeferred = self.handleTables(databasesDeferred);
    var columnsDeferred = self.handleColumns(colRefDeferred);
    self.handleValues(colRefDeferred);
    var pathsDeferred = self.handlePaths();

    var joinsDeferred = self.handleJoins();
    var joinConditionsDeferred = self.handleJoinConditions();
    var aggregateFunctionsDeferred = self.handleAggregateFunctions();
    var groupBysDeferred = self.handleGroupBys();
    var orderBysDeferred = self.handleOrderBys();

    $.when(colRefDeferred, databasesDeferred, tablesDeferred, columnsDeferred, pathsDeferred, joinsDeferred,
        joinConditionsDeferred, aggregateFunctionsDeferred, groupBysDeferred, orderBysDeferred).done(function () {
      huePubSub.publish('hue.ace.autocompleter.done');
    });
  };

  /**
   * For some suggestions the column type is needed, for instance with functions we should only suggest
   * columns that matches the argument type, cos(|) etc.
   *
   * The deferred will always resolve, and the default values is { type: 'T' }
   *
   * @returns {object} - jQuery Deferred
   */
  Suggestions.prototype.handleColumnReference = function () {
    var self = this;
    var colRefDeferred = $.Deferred();
    if (self.parseResult.colRef) {
      var colRefCallback = function (data) {
        if (typeof data.type !== 'undefined') {
          colRefDeferred.resolve(data);
        } else if (typeof data.extended_columns !== 'undefined' && data.extended_columns.length === 1) {
          colRefDeferred.resolve(data.extended_columns[0]);
        } else {
          colRefDeferred.resolve({ type: 'T' })
        }
      };

      var foundVarRef = self.parseResult.colRef.identifierChain.filter(function (identifier) {
        return typeof identifier.name !== 'undefined' && identifier.name.indexOf('${') === 0;
      });

      if (foundVarRef.length > 0) {
        colRefDeferred.resolve({ type: 'T' });
      } else {
        self.fetchFieldsForIdentifiers(self.parseResult.colRef.identifierChain, colRefCallback, function () {
          colRefDeferred.resolve({ type: 'T' });
        });
      }
    } else {
      colRefDeferred.resolve({ type: 'T' });
    }
    return colRefDeferred;
  };

  Suggestions.prototype.loadDatabases = function () {
    var self = this;
    var databasesDeferred = $.Deferred();
    self.apiHelper.loadDatabases({
      sourceType: self.snippet.type(),
      successCallback: databasesDeferred.resolve,
      timeout: AUTOCOMPLETE_TIMEOUT,
      silenceErrors: true,
      errorCallback: function () {
        databasesDeferred.resolve([]);
      }
    });
    return databasesDeferred;
  };

  Suggestions.prototype.handleKeywords = function (colRefDeferred) {
    var self = this;
    if (self.parseResult.suggestKeywords) {
      var keywordSuggestions = $.map(self.parseResult.suggestKeywords, function (keyword) {
        return { value: self.parseResult.lowerCase ? keyword.value.toLowerCase() : keyword.value, meta: AutocompleterGlobals.i18n.meta.keyword, weight: keyword.weight };
      });
      self.keywords(keywordSuggestions);
    }

    if (self.parseResult.suggestColRefKeywords) {
      self.loadingKeywords(true);
      // Wait for the column reference type to be resolved to pick the right keywords
      colRefDeferred.done(function (colRef) {
        var keywordSuggestions = self.keywords();
        Object.keys(self.parseResult.suggestColRefKeywords).forEach(function (typeForKeywords) {
          if (SqlFunctions.matchesType(sourceType, [typeForKeywords], [colRef.type.toUpperCase()])) {
            self.parseResult.suggestColRefKeywords[typeForKeywords].forEach(function (keyword) {
              keywordSuggestions.push({ value: self.parseResult.lowerCase ? keyword.toLowerCase() : keyword, meta: AutocompleterGlobals.i18n.meta.keyword, weight: DEFAULT_WEIGHTS.COLREF_KEYWORD });
            })
          }
        });
        self.keywords(keywordSuggestions);
        self.loadingKeywords(false);
      });
    }
  };

  Suggestions.prototype.handleIdentifiers = function () {
    var self = this;
    if (self.parseResult.suggestIdentifiers) {
      var identifierSuggestions = [];
      self.parseResult.suggestIdentifiers.forEach(function (identifier) {
        identifierSuggestions.push({ value: identifier.name, meta: identifier.type, weight: DEFAULT_WEIGHTS.IDENTIFIER });
      });
      self.identifiers(identifierSuggestions);
    }
  };

  Suggestions.prototype.handleColumnAliases = function () {
    var self = this;
    if (self.parseResult.suggestColumnAliases) {
      var columnAliasSuggestions = [];
      self.parseResult.suggestColumnAliases.forEach(function (columnAlias) {
        var type = columnAlias.types && columnAlias.types.length == 1 ? columnAlias.types[0] : 'T';
        if (type === 'COLREF') {
          columnAliasSuggestions.push({ value: columnAlias.name, meta: AutocompleterGlobals.i18n.meta.alias, weight: DEFAULT_WEIGHTS.COLUMN });
        } else {
          columnAliasSuggestions.push({ value: columnAlias.name, meta: type, weight: DEFAULT_WEIGHTS.COLUMN });
        }
      });
      self.columnAliases(columnAliasSuggestions);
    }
  };

  Suggestions.prototype.handleCommonTableExpressions = function () {
    var self = this;
    if (self.parseResult.suggestCommonTableExpressions) {
      var commonTableExpressionSuggestions = [];
      self.parseResult.suggestCommonTableExpressions.forEach(function (expression) {
        var prefix = expression.prependQuestionMark ? '? ' : '';
        if (expression.prependFrom) {
          prefix += self.parseResult.lowerCase ? 'from ' : 'FROM ';
        }
        commonTableExpressionSuggestions.push({ value: prefix + expression.name, meta: AutocompleterGlobals.i18n.meta.commonTableExpression, weight: DEFAULT_WEIGHTS.CTE });
      });
      self.commonTableExpressions(commonTableExpressionSuggestions);
    }
  };

  Suggestions.prototype.handleFunctions = function (colRefDeferred) {
    var self = this;
    if (self.parseResult.suggestFunctions) {
      var functionSuggestions = [];
      if (self.parseResult.suggestFunctions.types && self.parseResult.suggestFunctions.types[0] === 'COLREF') {
        self.loadingFunctions(true);
        colRefDeferred.done(function (colRef) {
          SqlFunctions.suggestFunctions(self.snippet.type(), [colRef.type.toUpperCase()], self.parseResult.suggestAggregateFunctions || false, self.parseResult.suggestAnalyticFunctions || false, functionSuggestions, DEFAULT_WEIGHTS.UDF);
          self.functions(functionSuggestions);
          self.loadingFunctions(false);
        });
      } else {
        SqlFunctions.suggestFunctions(self.snippet.type(), self.parseResult.suggestFunctions.types || ['T'], self.parseResult.suggestAggregateFunctions || false, self.parseResult.suggestAnalyticFunctions || false, functionSuggestions, DEFAULT_WEIGHTS.UDF);
        self.functions(functionSuggestions);
      }
    }
  };

  Suggestions.prototype.handleDatabases = function (databasesDeferred) {
    var self = this;
    var suggestDatabases = self.parseResult.suggestDatabases;
    if (suggestDatabases) {
      var prefix = suggestDatabases.prependQuestionMark ? '? ' : '';
      if (suggestDatabases.prependFrom) {
        prefix += self.parseResult.lowerCase ? 'from ' : 'FROM ';
      }
      var databaseSuggestions = [];
      self.loadingDatabases(true);
      databasesDeferred.done(function (dbs) {
        dbs.forEach(function (db) {
          databaseSuggestions.push({ value: prefix + self.backTickIfNeeded(db) + (suggestDatabases.appendDot ? '.' : ''), meta: AutocompleterGlobals.i18n.meta.database, weight: DEFAULT_WEIGHTS.DATABASE })
        });
        self.databases(databaseSuggestions);
        self.loadingDatabases(false);
      });
    }
  };

  Suggestions.prototype.handleTables = function (databasesDeferred, colRefDeferred) {
    var self = this;
    var tablesDeferred = $.Deferred();
    if (self.parseResult.suggestTables) {
      var suggestTables = self.parseResult.suggestTables;
      var fetchTables = function () {
        self.loadingTables(true);
        var prefix = suggestTables.prependQuestionMark ? '? ' : '';
        if (suggestTables.prependFrom) {
          prefix += self.parseResult.lowerCase ? 'from ' : 'FROM ';
        }

        self.apiHelper.fetchTables({
          sourceType: self.snippet.type(),
          databaseName: suggestTables.identifierChain && suggestTables.identifierChain.length === 1 ? suggestTables.identifierChain[0].name : self.activeDatabase,
          successCallback: function (data) {
            var tableSuggestions = [];
            data.tables_meta.forEach(function (tablesMeta) {
              if (suggestTables.onlyTables && tablesMeta.type.toLowerCase() !== 'table' ||
                  suggestTables.onlyViews && tablesMeta.type.toLowerCase() !== 'view') {
                return;
              }
              tableSuggestions.push({ value: prefix + self.backTickIfNeeded(tablesMeta.name), meta: AutocompleterGlobals.i18n.meta[tablesMeta.type.toLowerCase()], weight: DEFAULT_WEIGHTS.TABLE });
            });
            self.loadingTables(false);
            self.tables(tableSuggestions);
            tablesDeferred.resolve(tableSuggestions);
          },
          silenceErrors: true,
          errorCallback: function () {
            self.loadingTables(false);
            tablesDeferred.resolve([]);
          },
          timeout: AUTOCOMPLETE_TIMEOUT
        });
      };

      if (self.snippet.type() == 'impala' && self.parseResult.suggestTables.identifierChain && self.parseResult.suggestTables.identifierChain.length === 1) {
        databasesDeferred.done(function (databases) {
          var foundDb = databases.filter(function (db) {
            return db.toLowerCase() === self.parseResult.suggestTables.identifierChain[0].name.toLowerCase();
          });
          if (foundDb.length > 0) {
            fetchTables();
          } else {
            self.parseResult.suggestColumns = { tables: [{ identifierChain: self.parseResult.suggestTables.identifierChain }] };
            return self.handleColumns(colRefDeferred);
          }
        });
      } else if (self.snippet.type() == 'impala' && self.parseResult.suggestTables.identifierChain && self.parseResult.suggestTables.identifierChain.length > 1) {
        self.parseResult.suggestColumns = { tables: [{ identifierChain: self.parseResult.suggestTables.identifierChain }] };
        return self.handleColumns(colRefDeferred);
      } else {
        fetchTables();
      }
    } else {
      tablesDeferred.resolve([]);
    }

    return tablesDeferred;
  };

  Suggestions.prototype.handleColumns = function (colRefDeferred) {
    var self = this;
    var columnsDeferred = $.Deferred();
    if (self.parseResult.suggestColumns) {
      var suggestColumns = self.parseResult.suggestColumns;
      var columnSuggestions = [];
      // For multiple tables we need to merge and make sure identifiers are unique
      var columnDeferrals = [];

      if (suggestColumns.types && suggestColumns.types[0] === 'COLREF') {
        self.loadingColumns(true);
        colRefDeferred.done(function (colRef) {
          suggestColumns.tables.forEach(function (table) {
            columnDeferrals.push(self.addColumns(table, [colRef.type.toUpperCase()], columnSuggestions));
          });
        });
      } else {
        self.loadingColumns(true);
        suggestColumns.tables.forEach(function (table) {
          columnDeferrals.push(self.addColumns(table, suggestColumns.types || ['T'], columnSuggestions));
        });
      }

      $.when.apply($, columnDeferrals).done(function () {
        self.mergeColumns(columnSuggestions);
        if (self.snippet.type() === 'hive' && /[^\.]$/.test(self.editor())) {
          columnSuggestions.push({ value: 'BLOCK__OFFSET__INSIDE__FILE', meta: AutocompleterGlobals.i18n.meta.virtual, weight: DEFAULT_WEIGHTS.VIRTUAL_COLUMN });
          columnSuggestions.push({ value: 'INPUT__FILE__NAME', meta: AutocompleterGlobals.i18n.meta.virtual, weight: DEFAULT_WEIGHTS.VIRTUAL_COLUMN });
        }
        self.columns(columnSuggestions);
        columnsDeferred.resolve(columnSuggestions);
        self.loadingColumns(false);
      });
    } else {
      columnsDeferred.resolve([]);
    }
    return columnsDeferred;
  };

  Suggestions.prototype.addColumns = function (table, types, columnSuggestions) {
    var self = this;
    var addColumnsDeferred = $.Deferred();

    if (typeof table.identifierChain !== 'undefined' && table.identifierChain.length === 1 && typeof table.identifierChain[0].subQuery !== 'undefined') {
      var foundSubQuery = self.locateSubQuery(self.parseResult.subQueries, table.identifierChain[0].subQuery);

      var addSubQueryColumns = function (subQueryColumns) {
        subQueryColumns.forEach(function (column) {
          if (column.alias || column.identifierChain) {
            // TODO: Potentially fetch column types for sub-queries, possible performance hit.
            var type = typeof column.type !== 'undefined' && column.type !== 'COLREF' ? column.type : 'T';
            if (column.alias) {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.alias), meta: type, weight: DEFAULT_WEIGHTS.COLUMN, table: table })
            } else if (column.identifierChain && column.identifierChain.length > 0) {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.identifierChain[column.identifierChain.length - 1].name), meta: type, weight: DEFAULT_WEIGHTS.COLUMN, table: table })
            }
          } else if (column.subQuery && foundSubQuery.subQueries) {
            var foundNestedSubQuery = self.locateSubQuery(foundSubQuery.subQueries, column.subQuery);
            if (foundNestedSubQuery !== null) {
              addSubQueryColumns(foundNestedSubQuery.columns);
            }
          }
        });
      };
      if (foundSubQuery !== null && foundSubQuery.columns.length > 0) {
        addSubQueryColumns(foundSubQuery.columns);
      }
      addColumnsDeferred.resolve();
    } else {
      var callback = function (data) {
        if (data.extended_columns) {
          data.extended_columns.forEach(function (column) {
            if (column.type.indexOf('map') === 0 && self.snippet.type() === 'hive') {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.name) + '[]', meta: 'map', weight: DEFAULT_WEIGHTS.COLUMN, table: table })
            } else if (column.type.indexOf('map') === 0) {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.name), meta: 'map', weight: DEFAULT_WEIGHTS.COLUMN, table: table })
            } else if (column.type.indexOf('struct') === 0) {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.name), meta: 'struct', weight: DEFAULT_WEIGHTS.COLUMN, table: table })
            } else if (column.type.indexOf('array') === 0 && self.snippet.type() === 'hive') {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.name) + '[]', meta: 'array', weight: DEFAULT_WEIGHTS.COLUMN, table: table })
            } else if (column.type.indexOf('array') === 0) {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.name), meta: 'array', weight: DEFAULT_WEIGHTS.COLUMN, table: table })
            } else if (types[0].toUpperCase() !== 'T' && types.filter(function (type) { return type.toUpperCase() === column.type.toUpperCase() }).length > 0) {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.name), meta: column.type, weight: DEFAULT_WEIGHTS.COLUMN + 1, table: table })
            } else if (SqlFunctions.matchesType(self.snippet.type(), types, [column.type.toUpperCase()]) ||
                SqlFunctions.matchesType(self.snippet.type(), [column.type.toUpperCase()], types)) {
              columnSuggestions.push({ value: self.backTickIfNeeded(column.name), meta: column.type, weight: DEFAULT_WEIGHTS.COLUMN, table: table })
            }
          });
        } else if (data.columns) {
          data.columns.forEach(function (column) {
            columnSuggestions.push({ value: self.backTickIfNeeded(column), meta: 'column', weight: DEFAULT_WEIGHTS.COLUMN, table: table })
          });
        }
        if (data.type === 'map' && self.snippet.type() === 'impala') {
          columnSuggestions.push({ value: 'key', meta: 'key', weight: DEFAULT_WEIGHTS.COLUMN, table: table });
          columnSuggestions.push({ value: 'value', meta: 'value', weight: DEFAULT_WEIGHTS.COLUMN, table: table });
        }
        if (data.type === 'struct') {
          data.fields.forEach(function (field) {
            columnSuggestions.push({ value: self.backTickIfNeeded(field.name), meta: field.type, weight: DEFAULT_WEIGHTS.COLUMN, table: table })
          });
        } else if (data.type === 'map' && (data.value && data.value.fields)) {
          data.value.fields.forEach(function (field) {
            if (SqlFunctions.matchesType(self.snippet.type(), types, [field.type.toUpperCase()]) ||
                SqlFunctions.matchesType(self.snippet.type(), [field.type.toUpperCase()], types)) {
              columnSuggestions.push({ value: self.backTickIfNeeded(field.name), meta: field.type, weight: DEFAULT_WEIGHTS.COLUMN, table: table });
            }
          });
        } else if (data.type === 'array' && data.item) {
          if (data.item.fields) {
            data.item.fields.forEach(function (field) {
              if ((field.type === 'array' || field.type === 'map')) {
                if (self.snippet.type() === 'hive') {
                  columnSuggestions.push({ value: self.backTickIfNeeded(field.name) + '[]', meta: field.type, weight: DEFAULT_WEIGHTS.COLUMN, table: table });
                } else {
                  columnSuggestions.push({ value: self.backTickIfNeeded(field.name), meta: field.type, weight: DEFAULT_WEIGHTS.COLUMN, table: table });
                }
              } else if (SqlFunctions.matchesType(self.snippet.type(), types, [field.type.toUpperCase()]) ||
                  SqlFunctions.matchesType(self.snippet.type(), [field.type.toUpperCase()], types)) {
                columnSuggestions.push({ value: self.backTickIfNeeded(field.name), meta: field.type, weight: DEFAULT_WEIGHTS.COLUMN, table: table });
              }
            });
          } else if (typeof data.item.type !== 'undefined') {
            if (SqlFunctions.matchesType(self.snippet.type(), types, [data.item.type.toUpperCase()])) {
              columnSuggestions.push({ value: 'item', meta: data.item.type, weight: DEFAULT_WEIGHTS.COLUMN, table: table });
            }
          }
        }
        addColumnsDeferred.resolve();
      };

      self.fetchFieldsForIdentifiers(table.identifierChain, callback, addColumnsDeferred.resolve);
    }
    return addColumnsDeferred;
  };

  Suggestions.prototype.mergeColumns = function (columnSuggestions) {
    columnSuggestions.sort(function (a, b) {
      return a.value.localeCompare(b.value);
    });

    for (var i = 0; i < columnSuggestions.length; i++) {
      var suggestion = columnSuggestions[i];
      suggestion.isColumn = true;
      var hasDuplicates = false;
      for (i; i + 1 < columnSuggestions.length && columnSuggestions[i + 1].value === suggestion.value; i++) {
        var nextTable = columnSuggestions[i + 1].table;
        if (typeof nextTable.alias !== 'undefined') {
          columnSuggestions[i + 1].value = nextTable.alias + '.' + columnSuggestions[i + 1].value
        } else if (typeof nextTable.identifierChain !== 'undefined' && nextTable.identifierChain.length > 0) {
          var lastIdentifier = nextTable.identifierChain[nextTable.identifierChain.length - 1];
          if (typeof lastIdentifier.name !== 'undefined') {
            columnSuggestions[i + 1].value = lastIdentifier.name + '.' + columnSuggestions[i + 1].value;
          } else if (typeof lastIdentifier.subQuery !== 'undefined') {
            columnSuggestions[i + 1].value = lastIdentifier.subQuery + '.' + columnSuggestions[i + 1].value;
          }
        }
        hasDuplicates = true;
      }
      if (typeof suggestion.table.alias !== 'undefined') {
        suggestion.value = suggestion.table.alias + '.' + suggestion.value;
      } else if (hasDuplicates && typeof suggestion.table.identifierChain !== 'undefined' && suggestion.table.identifierChain.length > 0) {
        var lastIdentifier = suggestion.table.identifierChain[suggestion.table.identifierChain.length - 1];
        if (typeof lastIdentifier.name !== 'undefined') {
          suggestion.value = lastIdentifier.name + '.' + suggestion.value;
        } else if (typeof lastIdentifier.subQuery !== 'undefined') {
          suggestion.value = lastIdentifier.subQuery + '.' + suggestion.value;
        }
      }
      delete suggestion.table;
    }
  };

  Suggestions.prototype.handleValues = function (colRefDeferred) {
    var self = this;
    var suggestValues = self.parseResult.suggestValues;
    if (suggestValues) {
      var valueSuggestions = [];
      if (self.parseResult.colRef && self.parseResult.colRef.identifierChain) {
        valueSuggestions.push({ value: '${' + self.parseResult.colRef.identifierChain[self.parseResult.colRef.identifierChain.length - 1].name + '}', meta: AutocompleterGlobals.i18n.meta.variable, weight: DEFAULT_WEIGHTS.VARIABLE });
      }
      colRefDeferred.done(function (colRef) {
        if (colRef.sample) {
          var isString = colRef.type === "string";
          var startQuote = suggestValues.partialQuote ? '' : '\'';
          var endQuote = typeof suggestValues.missingEndQuote !== 'undefined' && suggestValues.missingEndQuote === false ? '' : suggestValues.partialQuote || '\'';
          colRef.sample.forEach(function (sample) {
            valueSuggestions.push({ value: isString ? startQuote + sample + endQuote : new String(sample), meta: AutocompleterGlobals.i18n.meta.value, weight: DEFAULT_WEIGHTS.SAMPLE })
          });
        }
        self.values(valueSuggestions);
      });
    }
  };

  Suggestions.prototype.handlePaths = function () {
    var self = this;
    var suggestHdfs = self.parseResult.suggestHdfs;
    var pathsDeferred = $.Deferred();
    if (suggestHdfs) {
      var parts = suggestHdfs.path.split('/');
      // Drop the first " or '
      parts.shift();
      // Last one is either partial name or empty
      parts.pop();

      self.loadingPaths(true);
      self.apiHelper.fetchHdfsPath({
        pathParts: parts,
        successCallback: function (data) {
          if (!data.error) {
            var pathSuggestions = [];
            data.files.forEach(function (file) {
              if (file.name !== '..' && file.name !== '.') {
                pathSuggestions.push({
                  value: suggestHdfs.path === '' ? '/' + file.name : file.name,
                  meta: file.type,
                  weight: DEFAULT_WEIGHTS.HDFS
                });
              }
            });
            pathsDeferred.resolve(pathSuggestions);
            self.paths(pathSuggestions);
          }
          self.loadingPaths(false);
        },
        silenceErrors: true,
        errorCallback: function () {
          pathsDeferred.resolve([]);
          self.loadingPaths(false);
        },
        timeout: AUTOCOMPLETE_TIMEOUT
      });
    } else {
      pathsDeferred.resolve([]);
    }
    return pathsDeferred;
  };

  Suggestions.prototype.handleJoins = function () {
    var self = this;
    var joinsDeferred = $.Deferred();
    var suggestJoins = self.parseResult.suggestJoins;
    if (HAS_OPTIMIZER && suggestJoins) {
      self.loadingJoins(true);
      self.apiHelper.fetchNavOptPopularJoins({
        sourceType: self.snippet.type(),
        timeout: AUTOCOMPLETE_TIMEOUT,
        defaultDatabase: self.activeDatabase,
        silenceErrors: true,
        tables: suggestJoins.tables,
        successCallback: function (data) {
          var joinSuggestions = [];
          data.values.forEach(function (value) {
            var suggestionString = suggestJoins.prependJoin ? (self.parseResult.lowerCase ? 'join ' : 'JOIN ') : '';
            var first = true;

            var existingTables = {};
            suggestJoins.tables.forEach(function (table) {
              existingTables[table.identifierChain[table.identifierChain.length - 1].name] = true;
            });

            var joinRequired = false;
            var tablesAdded = false;
            value.tables.forEach(function (table) {
              var tableParts = table.split('.');
              if (!existingTables[tableParts[tableParts.length - 1]]) {
                tablesAdded = true;
                var identifier = self.convertNavOptQualifiedIdentifier(table, suggestJoins.tables);
                suggestionString += joinRequired ? (self.parseResult.lowerCase ? ' join ' : ' JOIN ') + identifier : identifier;
                joinRequired = true;
              }
            });

            if (value.joinCols.length > 0) {
              if (!tablesAdded && suggestJoins.prependJoin) {
                suggestionString = '';
                tablesAdded = true;
              }
              suggestionString += self.parseResult.lowerCase ? ' on ' : ' ON ';
            }
            if (tablesAdded) {
              value.joinCols.forEach(function (joinColPair) {
                if (!first) {
                  suggestionString += self.parseResult.lowerCase ? ' and ' : ' AND ';
                }
                suggestionString += self.convertNavOptQualifiedIdentifier(joinColPair.columns[0], suggestJoins.tables) + ' = ' + self.convertNavOptQualifiedIdentifier(joinColPair.columns[1], suggestJoins.tables);
                first = false;
              });
              joinSuggestions.push({
                value: suggestionString,
                meta: AutocompleterGlobals.i18n.meta.join,
                weight: suggestJoins.prependJoin ? DEFAULT_WEIGHTS.JOIN : DEFAULT_WEIGHTS.POPULAR_ACTIVE_JOIN,
                detailsTemplate: 'join',
                details: value
              });
            }
          });
          self.joins(joinSuggestions);
          self.loadingJoins(false);
          joinsDeferred.resolve(joinSuggestions);
        },
        errorCallback: function () {
          self.loadingJoins(false);
          joinsDeferred.resolve([]);
        }
      });
    } else {
      joinsDeferred.resolve([]);
    }
    return joinsDeferred;
  };

  Suggestions.prototype.handleJoinConditions = function () {
    var self = this;
    var joinConditionsDeferred = $.Deferred();
    var suggestJoinConditions = self.parseResult.suggestJoinConditions;
    if (HAS_OPTIMIZER && suggestJoinConditions) {
      self.loadingJoinConditions(true);
      self.apiHelper.fetchNavOptPopularJoins({
        sourceType: self.snippet.type(),
        timeout: AUTOCOMPLETE_TIMEOUT,
        defaultDatabase: self.activeDatabase,
        silenceErrors: true,
        tables: suggestJoinConditions.tables,
        successCallback: function (data) {
          var joinConditionSuggestions = [];
          data.values.forEach(function (value) {
            if (value.joinCols.length > 0) {
              var suggestionString = suggestJoinConditions.prependOn ? (self.parseResult.lowerCase ? 'on ' : 'ON ') : '';
              var first = true;
              value.joinCols.forEach(function (joinColPair) {
                if (!first) {
                  suggestionString += self.parseResult.lowerCase ? ' and ' : ' AND ';
                }
                suggestionString += self.convertNavOptQualifiedIdentifier(joinColPair.columns[0], suggestJoinConditions.tables) + ' = ' + self.convertNavOptQualifiedIdentifier(joinColPair.columns[1], suggestJoinConditions.tables);
                first = false;
              });
              joinConditionSuggestions.push({
                value: suggestionString,
                meta: AutocompleterGlobals.i18n.meta.joinCondition,
                weight: DEFAULT_WEIGHTS.POPULAR_JOIN_CONDITION,
                detailsTemplate: 'join-condition',
                details: value
              });
            }
          });
          self.joinConditions(joinConditionSuggestions);
          joinConditionsDeferred.resolve();
          self.loadingJoinConditions(false);
        },
        errorCallback: function () {
          self.loadingJoinConditions(false);
          joinConditionsDeferred.resolve([]);
        }
      });
    } else {
      joinConditionsDeferred.resolve([]);
    }

    return joinConditionsDeferred;
  };

  Suggestions.prototype.handleAggregateFunctions = function () {
    var self = this;
    var aggregateFunctionsDeferred = $.Deferred();
    var suggestAggregateFunctions = self.parseResult.suggestAggregateFunctions;
    if (HAS_OPTIMIZER && suggestAggregateFunctions && suggestAggregateFunctions.tables.length > 0) {
      self.loadingAggregateFunctions(true);
      self.apiHelper.fetchNavOptTopAggs({
        sourceType: self.snippet.type(),
        timeout: AUTOCOMPLETE_TIMEOUT,
        defaultDatabase: self.activeDatabase,
        silenceErrors: true,
        tables: suggestAggregateFunctions.tables,
        successCallback: function (data) {
          if (data.values.length > 0) {
            // TODO: Handle column conflicts with multiple tables

            // Substitute qualified table identifiers with either alias or empty string
            var substitutions = [];
            suggestAggregateFunctions.tables.forEach(function (table) {
              var replaceWith = table.alias ? table.alias + '.' : '';
              if (table.identifierChain.length > 1) {
                substitutions.push({
                  replace: new RegExp($.map(table.identifierChain, function (identifier) {
                        return identifier.name
                      }).join('\.') + '\.', 'gi'),
                  with: replaceWith
                })
              } else if (table.identifierChain.length === 1) {
                substitutions.push({
                  replace: new RegExp(database + '\.' + table.identifierChain[0].name + '\.', 'gi'),
                  with: replaceWith
                });
                substitutions.push({
                  replace: new RegExp(table.identifierChain[0].name + '\.', 'gi'),
                  with: replaceWith
                })
              }
            });

            var aggregateFunctionsSuggestions = [];
            data.values.forEach(function (value) {
              var clean = value.aggregateClause;
              substitutions.forEach(function (substitution) {
                clean = clean.replace(substitution.replace, substitution.with);
              });
              aggregateFunctionsSuggestions.push({
                value: clean,
                meta: AutocompleterGlobals.i18n.meta.aggregateFunction,
                weight: DEFAULT_WEIGHTS.POPULAR_AGGREGATE + Math.min(value.totalQueryCount, 99),
                detailsTemplate: 'aggregate-function',
                details: value
              });
            })
          }
          self.aggregateFunctions(aggregateFunctionsSuggestions);
          aggregateFunctionsDeferred.resolve();
          self.loadingAggregateFunctions(false);
        },
        errorCallback: function () {
          self.loadingAggregateFunctions(false);
          aggregateFunctionsDeferred.resolve();
        }
      });
    }
    return aggregateFunctionsDeferred;
  };

  Suggestions.prototype.handleGroupBys = function () {
    var self = this;
    var groupBysDeferred = $.Deferred();
    var suggestGroupBys = self.parseResult.suggestGroupBys;
    if (HAS_OPTIMIZER && suggestGroupBys) {
      self.loadingGroupBys(true);
      self.apiHelper.fetchNavOptTopColumns({
        sourceType: self.snippet.type(),
        timeout: AUTOCOMPLETE_TIMEOUT,
        defaultDatabase: self.activeDatabase,
        silenceErrors: true,
        tables: suggestGroupBys.tables,
        successCallback: function (data) {
          var groupBySuggestions = [];
          if (typeof data.values.groupbyColumns !== 'undefined') {
            var prefix = suggestGroupBys.prefix ? (self.parseResult.lowerCase ? suggestGroupBys.prefix.toLowerCase() : suggestGroupBys.prefix) + ' ' : '';
            data.values.groupbyColumns.forEach(function (value) {
              groupBySuggestions.push({
                value: prefix + self.createNavOptIdentifierForColumn(value, suggestGroupBys.tables),
                meta: AutocompleterGlobals.i18n.meta.groupBy,
                weight: DEFAULT_WEIGHTS.POPULAR_GROUP_BY + Math.min(value.columnCount, 99),
                detailsTemplate: 'group-by',
                details: value
              });
            });
          }
          self.groupBys(groupBySuggestions);
          self.loadingGroupBys(false);
          groupBysDeferred.resolve(groupBySuggestions);
        },
        errorCallback: function () {
          self.loadingGroupBys(false);
          groupBysDeferred.resolve([])
        }
      });
    } else {
      groupBysDeferred.resolve([]);
    }

    return groupBysDeferred;
  };

  Suggestions.prototype.handleOrderBys = function () {
    var self = this;
    var orderBysDeferred = $.Deferred();
    var suggestOrderBys = self.parseResult.suggestOrderBys;
    if (HAS_OPTIMIZER && suggestOrderBys) {
      self.apiHelper.fetchNavOptTopColumns({
        sourceType: self.snippet.type(),
        timeout: AUTOCOMPLETE_TIMEOUT,
        defaultDatabase: self.activeDatabase,
        silenceErrors: true,
        tables: suggestOrderBys.tables,
        successCallback: function (data) {
          var orderBySuggestions = [];
          if (typeof data.values.orderbyColumns !== 'undefined') {
            var prefix = suggestOrderBys.prefix ? (self.parseResult.lowerCase ? suggestOrderBys.prefix.toLowerCase() : suggestOrderBys.prefix) + ' ' : '';
            data.values.orderbyColumns.forEach(function (value) {
              orderBySuggestions.push({
                value: prefix + self.createNavOptIdentifierForColumn(value, suggestOrderBys.tables),
                meta: AutocompleterGlobals.i18n.meta.orderBy,
                weight: DEFAULT_WEIGHTS.POPULAR_ORDER_BY + Math.min(value.columnCount, 99),
                detailsTemplate: 'order-by',
                details: value
              });
            });
          }
          self.orderBys(orderBySuggestions);
          self.loadingOrderBys(false);
          orderBysDeferred.resolve(orderBySuggestions);
        },
        errorCallback: function () {
          self.loadingOrderBys(false);
          orderBysDeferred.resolve([]);
        }
      });
    } else {
      orderBysDeferred.resolve([]);
    }
    return orderBysDeferred;
  };

  Suggestions.prototype.createNavOptIdentifierForColumn = function (navOptColumn, tables) {
    var self = this;
    for (var i = 0; i < tables.length; i++) {
      if (navOptColumn.dbName && (navOptColumn.dbName !== self.activeDatabase || navOptColumn.dbName !== tables[i].identifierChain[0].name)) {
        continue;
      }
      if (navOptColumn.tableName && navOptColumn.tableName === tables[i].identifierChain[tables[i].identifierChain.length - 1].name && tables[i].alias) {
        return tables[i].alias + '.' + navOptColumn.columnName;
      }
    }

    if (navOptColumn.dbName && navOptColumn.dbName !== self.activeDatabase) {
      return navOptColumn.dbName + '.' + navOptColumn.tableName + '.' + navOptColumn.columnName;
    }
    if (tables.length > 1) {
      return navOptColumn.tableName + '.' + navOptColumn.columnName;
    }
    return navOptColumn.columnName;
  };

  Suggestions.prototype.convertNavOptQualifiedIdentifier = function (qualifiedIdentifier, tables) {
    var self = this;
    var aliases = [];
    var tablesHasDefaultDatabase = false;
    tables.forEach(function (table) {
      tablesHasDefaultDatabase = tablesHasDefaultDatabase || table.identifierChain[0].name.toLowerCase() === self.activeDatabase.toLowerCase();
      if (table.alias) {
        aliases.push({ qualifiedName: $.map(table.identifierChain, function (identifier) { return identifier.name }).join('.').toLowerCase(), alias: table.alias });
      }
    });

    for (var i = 0; i < aliases.length; i++) {
      if (qualifiedIdentifier.toLowerCase().indexOf(aliases[i].qualifiedName) === 0) {
        return aliases[i].alias + qualifiedIdentifier.substring(aliases[i].qualifiedName.length);
      } else if (qualifiedIdentifier.toLowerCase().indexOf(self.activeDatabase.toLowerCase() + '.' + aliases[i].qualifiedName) === 0) {
        return aliases[i].alias + qualifiedIdentifier.substring((self.activeDatabase + '.' + aliases[i].qualifiedName).length);
      }
    }

    return qualifiedIdentifier.toLowerCase().indexOf(self.activeDatabase.toLowerCase()) === 0 && !tablesHasDefaultDatabase ? qualifiedIdentifier.substring(self.activeDatabase.length + 1) : qualifiedIdentifier;
  };

  /**
   * Helper function to fetch columns/fields given an identifierChain, this also takes care of expanding arrays
   * and maps to match the required format for the API.
   *
   * @param originalIdentifierChain
   * @param callback
   * @param errorCallback
   */

  Suggestions.prototype.fetchFieldsForIdentifiers = function (originalIdentifierChain, callback, errorCallback) {
    var self = this;
    var identifierChain = originalIdentifierChain.concat();

    var fetchFieldsInternal =  function (table, database, identifierChain, callback, errorCallback, fetchedFields) {
      if (!identifierChain) {
        identifierChain = [];
      }
      if (identifierChain.length > 0) {
        fetchedFields.push(identifierChain[0].name);
        identifierChain = identifierChain.slice(1);
      }

      // Parser sometimes knows if it's a map or array.
      if (identifierChain.length > 0 && (identifierChain[0].name === 'item' || identifierChain[0].name === 'value')) {
        fetchedFields.push(identifierChain[0].name);
        identifierChain = identifierChain.slice(1);
      }

      self.apiHelper.fetchFields({
        sourceType: self.snippet.type(),
        databaseName: database,
        tableName: table,
        fields: fetchedFields,
        timeout: AUTOCOMPLETE_TIMEOUT,
        successCallback: function (data) {
          if (self.snippet.type() === 'hive'
              && typeof data.extended_columns !== 'undefined'
              && data.extended_columns.length === 1
              && data.extended_columns.length
              && /^map|array|struct/i.test(data.extended_columns[0].type)) {
            identifierChain.unshift({ name: data.extended_columns[0].name })
          }
          if (identifierChain.length > 0) {
            if (typeof identifierChain[0].name !== 'undefined' && /value|item|key/i.test(identifierChain[0].name)) {
              fetchedFields.push(identifierChain[0].name);
              identifierChain.shift();
            } else {
              if (data.type === 'array') {
                fetchedFields.push('item')
              }
              if (data.type === 'map') {
                fetchedFields.push('value')
              }
            }
            fetchFieldsInternal(table, database, identifierChain, callback, errorCallback, fetchedFields)
          } else {
            callback(data);
          }
        },
        silenceErrors: true,
        errorCallback: errorCallback
      });
    };

    // For Impala the first parts of the identifier chain could be either database or table, either:
    // SELECT | FROM database.table -or- SELECT | FROM table.column

    // For Hive it could be either:
    // SELECT col.struct FROM db.tbl -or- SELECT col.struct FROM tbl
    if (self.snippet.type() === 'impala' || self.snippet.type() === 'hive') {
      if (identifierChain.length > 1) {
        self.apiHelper.loadDatabases({
          sourceType: self.snippet.type(),
          timeout: AUTOCOMPLETE_TIMEOUT,
          successCallback: function (data) {
            var foundDb = data.filter(function (db) {
              return db.toLowerCase() === identifierChain[0].name.toLowerCase();
            });
            var databaseName = foundDb.length > 0 ? identifierChain.shift().name : self.activeDatabase;
            var tableName = identifierChain.shift().name;
            fetchFieldsInternal(tableName, databaseName, identifierChain, callback, errorCallback, []);
          },
          silenceErrors: true,
          errorCallback: errorCallback
        });
      } else {
        var databaseName = self.activeDatabase;
        var tableName = identifierChain.shift().name;
        fetchFieldsInternal(tableName, databaseName, identifierChain, callback, errorCallback, []);
      }
    } else {
      var databaseName = identifierChain.length > 1 ? identifierChain.shift().name : self.activeDatabase;
      var tableName = identifierChain.shift().name;
      fetchFieldsInternal(tableName, databaseName, identifierChain, callback, errorCallback, []);
    }
  };

  /**
   * @param {Object} options
   * @param {Snippet} options.snippet
   * @constructor
   */
  function SqlAutocompleter3(options) {
    var self = this;
    self.snippet = options.snippet;
    self.editor = options.editor;
    self.suggestions = new Suggestions(options);
  }

  SqlAutocompleter3.prototype.autocomplete = function () {
    var self = this;
    var parseResult = sql.parseSql(self.editor().getTextBeforeCursor(), self.editor().getTextAfterCursor(), self.snippet.type(), false);

    if (typeof hueDebug !== 'undefined' && hueDebug.showParseResult) {
      console.log(parseResult);
    }

    self.suggestions.update(parseResult);
  };

  return SqlAutocompleter3;
})();
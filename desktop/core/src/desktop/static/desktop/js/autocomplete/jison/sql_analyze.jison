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

DataDefinition
 : AnalyzeStatement
 | RefreshStatement
 | InvalidateStatement
 | ComputeStatsStatement
 ;

DataDefinition_EDIT
 : AnalyzeStatement_EDIT
 | RefreshStatement_EDIT
 | InvalidateStatement_EDIT
 | ComputeStatsStatement_EDIT
 ;

AnalyzeStatement
 : '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec '<hive>COMPUTE' '<hive>STATISTICS' OptionalForColumns OptionalCacheMetadata OptionalNoscan
   {
     addTablePrimary($3);
   }
 ;

AnalyzeStatement_EDIT
 : '<hive>ANALYZE' 'CURSOR'
   {
     suggestKeywords(['TABLE']);
   }
 | '<hive>ANALYZE' '<hive>TABLE' 'CURSOR'
   {
     suggestTables({ onlyTables: true });
     suggestDatabases({ appendDot: true });
   }
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier_EDIT OptionalPartitionSpec
   {
     if (parser.yy.result.suggestTables) {
       parser.yy.result.suggestTables.onlyTables = true;
     }
   }
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec_EDIT
   {
     addTablePrimary($3);
   }
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec 'CURSOR'
   {
     addTablePrimary($3);
     if (!$4) {
       suggestKeywords([{ value: 'PARTITION', weight: 2 }, { value: 'COMPUTE STATISTICS', weight: 1 }]);
     } else {
       suggestKeywords(['COMPUTE STATISTICS']);
     }
   }
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec '<hive>COMPUTE' 'CURSOR'
   {
     addTablePrimary($3);
     suggestKeywords(['STATISTICS']);
   }
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec '<hive>COMPUTE' '<hive>STATISTICS' 'CURSOR' OptionalForColumns OptionalCacheMetadata OptionalNoscan
   {
     addTablePrimary($3);
     suggestKeywords(getKeywordsForOptionalsLR([$8, $9, $10], [{ value: 'FOR COLUMNS', weight: 3 }, { value: 'CACHE METADATA', weight: 2 }, { value: 'NOSCAN', weight: 1 }]));
   }
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec '<hive>COMPUTE' '<hive>STATISTICS' ForColumns 'CURSOR' OptionalCacheMetadata OptionalNoscan
   {
     addTablePrimary($3);
     suggestKeywords(getKeywordsForOptionalsLR([$9, $10], [{ value: 'CACHE METADATA', weight: 2 }, { value: 'NOSCAN', weight: 1 }]));
   }
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec '<hive>COMPUTE' '<hive>STATISTICS' OptionalForColumns CacheMetadata 'CURSOR' OptionalNoscan
   {
     addTablePrimary($3);
     suggestKeywords(getKeywordsForOptionalsLR([$10], [{ value: 'NOSCAN', weight: 1 }]));
   }
 | '<hive>ANALYZE' 'CURSOR' SchemaQualifiedTableIdentifier OptionalPartitionSpec
   {
     suggestKeywords(['TABLE']);
     addTablePrimary($3);
   }
 | '<hive>ANALYZE' 'CURSOR' SchemaQualifiedTableIdentifier OptionalPartitionSpec '<hive>COMPUTE' '<hive>STATISTICS' OptionalForColumns OptionalCacheMetadata OptionalNoscan
   {
     suggestKeywords(['TABLE']);
     addTablePrimary($3);
   }
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier_EDIT OptionalPartitionSpec '<hive>COMPUTE' '<hive>STATISTICS' OptionalForColumns OptionalCacheMetadata OptionalNoscan
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec_EDIT '<hive>COMPUTE' '<hive>STATISTICS' OptionalForColumns OptionalCacheMetadata OptionalNoscan
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec '<hive>COMPUTE' '<hive>STATISTICS' ForColumns_EDIT OptionalCacheMetadata OptionalNoscan
 | '<hive>ANALYZE' '<hive>TABLE' SchemaQualifiedTableIdentifier OptionalPartitionSpec '<hive>COMPUTE' '<hive>STATISTICS' OptionalForColumns CacheMetadata_EDIT OptionalNoscan
 ;

OptionalForColumns
 :
 | ForColumns
 ;

ForColumns
 : '<hive>FOR' '<hive>COLUMNS'
 ;

ForColumns_EDIT
 : '<hive>FOR' 'CURSOR'
   {
     suggestKeywords(['COLUMNS']);
   }
 ;

OptionalCacheMetadata
 :
 | CacheMetadata
 ;

CacheMetadata
 : '<hive>CACHE' '<hive>METADATA'
 ;

CacheMetadata_EDIT
 : '<hive>CACHE' 'CURSOR'
   {
     suggestKeywords(['METADATA']);
   }
 ;

OptionalNoscan
 :
 | '<hive>NOSCAN'
 ;

RefreshStatement
 : '<impala>REFRESH' SchemaQualifiedTableIdentifier
   {
     addTablePrimary($2);
   }
 ;

RefreshStatement_EDIT
 : '<impala>REFRESH' 'CURSOR'
   {
     suggestTables();
     suggestDatabases({ appendDot: true });
   }
 | '<impala>REFRESH' SchemaQualifiedTableIdentifier_EDIT
 ;

InvalidateStatement
 : '<impala>INVALIDATE' '<impala>METADATA'
 | '<impala>INVALIDATE' '<impala>METADATA' SchemaQualifiedTableIdentifier
   {
     addTablePrimary($3);
   }
 ;

InvalidateStatement_EDIT
 : '<impala>INVALIDATE' 'CURSOR'
   {
     suggestKeywords(['METADATA']);
   }
 | '<impala>INVALIDATE' '<impala>METADATA' 'CURSOR'
   {
     suggestTables();
     suggestDatabases({ appendDot: true });
   }
 | '<impala>INVALIDATE' '<impala>METADATA' SchemaQualifiedTableIdentifier_EDIT
 | '<impala>INVALIDATE' 'CURSOR' SchemaQualifiedTableIdentifier
   {
     addTablePrimary($3);
     suggestKeywords(['METADATA']);
   }
 ;

ComputeStatsStatement
 : '<impala>COMPUTE' '<impala>STATS' SchemaQualifiedTableIdentifier
   {
     addTablePrimary($3);
   }
 | '<impala>COMPUTE' '<impala>INCREMENTAL' '<impala>STATS' SchemaQualifiedTableIdentifier OptionalPartitionSpec
   {
     addTablePrimary($4);
   }
 ;

ComputeStatsStatement_EDIT
 : '<impala>COMPUTE' 'CURSOR'
   {
     suggestKeywords(['STATS', 'INCREMENTAL STATS']);
   }
 | '<impala>COMPUTE' '<impala>STATS' 'CURSOR'
   {
     suggestTables();
     suggestDatabases({ appendDot: true });
   }
 | '<impala>COMPUTE' '<impala>STATS' SchemaQualifiedTableIdentifier_EDIT
 | '<impala>COMPUTE' 'CURSOR' SchemaQualifiedTableIdentifier OptionalPartitionSpec
   {
     addTablePrimary($3);
     suggestKeywords(['STATS', 'INCREMENTAL STATS']);
   }
 | '<impala>COMPUTE' 'CURSOR' '<impala>STATS' SchemaQualifiedTableIdentifier OptionalPartitionSpec
   {
     addTablePrimary($4);
     suggestKeywords(['INCREMENTAL']);
   }
 | '<impala>COMPUTE' '<impala>INCREMENTAL' 'CURSOR'
   {
     suggestKeywords(['STATS']);
   }
 | '<impala>COMPUTE' '<impala>INCREMENTAL' 'CURSOR' SchemaQualifiedTableIdentifier OptionalPartitionSpec
   {
     addTablePrimary($4);
     suggestKeywords(['STATS']);
   }
 | '<impala>COMPUTE' '<impala>INCREMENTAL' '<impala>STATS' 'CURSOR'
   {
     suggestTables();
     suggestDatabases({ appendDot: true });
   }
 | '<impala>COMPUTE' '<impala>INCREMENTAL' '<impala>STATS' SchemaQualifiedTableIdentifier_EDIT OptionalPartitionSpec
 | '<impala>COMPUTE' '<impala>INCREMENTAL' '<impala>STATS' SchemaQualifiedTableIdentifier 'CURSOR' OptionalPartitionSpec
   {
     addTablePrimary($4);
     if (!$6) {
       suggestKeywords(['PARTITION']);
     }
   }
 | '<impala>COMPUTE' '<impala>INCREMENTAL' '<impala>STATS' SchemaQualifiedTableIdentifier PartitionSpec_EDIT
   {
     addTablePrimary($4);
   }
 ;
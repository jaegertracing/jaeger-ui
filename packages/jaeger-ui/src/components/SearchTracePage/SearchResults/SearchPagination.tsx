// Copyright (c) 2024 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { Pagination } from 'antd';
import { SearchQuery } from '../../../types/search';

type SearchPaginationProps = {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number, pageSize?: number) => void;
  loading?: boolean;
};

const SearchPagination: React.FC<SearchPaginationProps> = ({
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  loading = false,
}) => {
  const handlePageChange = (page: number, size?: number) => {
    onPageChange(page, size || pageSize);
  };

  const handlePageSizeChange = (current: number, size: number) => {
    onPageChange(1, size); // Reset to page 1 when changing page size
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="SearchPagination" style={{ marginTop: '16px', textAlign: 'center' }}>
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={totalCount}
        showSizeChanger
        showQuickJumper
        showTotal={(total, range) =>
          `${range[0]}-${range[1]} of ${total} traces`
        }
        pageSizeOptions={['10', '20', '50', '100']}
        onChange={handlePageChange}
        onShowSizeChange={handlePageSizeChange}
        disabled={loading}
        size="default"
      />
    </div>
  );
};

export default SearchPagination;

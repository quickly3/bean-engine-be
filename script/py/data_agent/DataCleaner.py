class DataCleaner:
    def __init__(
        self,
        model: AnalysisLLM
    ):
        self.model = model
        
    async def clean_data(
        self,
        data: pd.DataFrame
    ) -> Dict[str, Any]:
        # 1. 数据概览
        profile = await self._profile_data(
            data
        )
        
        # 2. 识别问题
        issues = await self._identify_issues(
            data,
            profile
        )
        
        # 3. 执行清洗
        cleaned_data = await self._perform_cleaning(
            data,
            issues
        )
        
        return {
            "cleaned_data": cleaned_data,
            "profile": profile,
            "issues": issues
        }
        
    async def _identify_issues(
        self,
        data: pd.DataFrame,
        profile: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        issues = []
        
        # 1. 检查缺失值
        missing = await self._check_missing_values(
            data
        )
        issues.extend(missing)
        
        # 2. 检查异常值
        outliers = await self._detect_outliers(
            data
        )
        issues.extend(outliers)
        
        # 3. 检查数据类型
        type_issues = await self._check_data_types(
            data
        )
        issues.extend(type_issues)
        
        return issues
        
    async def _perform_cleaning(
        self,
        data: pd.DataFrame,
        issues: List[Dict[str, Any]]
    ) -> pd.DataFrame:
        cleaned = data.copy()
        
        for issue in issues:
            # 1. 处理缺失值
            if issue["type"] == "missing":
                cleaned = await self._handle_missing(
                    cleaned,
                    issue
                )
                
            # 2. 处理异常值
            elif issue["type"] == "outlier":
                cleaned = await self._handle_outlier(
                    cleaned,
                    issue
                )
                
            # 3. 处理类型问题
            elif issue["type"] == "type":
                cleaned = await self._handle_type(
                    cleaned,
                    issue
                )
                
        return cleaned

import pandas as pd
import numpy as np

np.random.seed(123456)

ts = pd.Series(np.random.randn(1000), index=pd.date_range("1/1/2000", periods=1000))

ts = ts.cumsum()

plt = ts.plot();

plt.show()


# df = pd.DataFrame(np.random.randn(1000, 4), index=ts.index, columns=list("ABCD"))

# df = df.cumsum()

# plt.figure();

# df.plot();

import undetected_chromedriver as uc
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

if __name__ == '__main__':
  driver = uc.Chrome(headless=True,use_subprocess=False)
  driver.get('https://space.bilibili.com/570064/channel/collectiondetail?sid=1609011')
  
  
  try:
    element = WebDriverWait(driver, 3).until(
        EC.presence_of_element_located((By.ID, "page-channel"))
    )
  finally:
      driver.quit()
  
  driver.save_screenshot('bilibili.png')
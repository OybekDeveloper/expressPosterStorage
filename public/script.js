document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const quickRanges = {
    today: { label: "Сегодня", from: today, to: today },
    yesterday: {
      label: "Вчера",
      from: new Date(today.setDate(today.getDate() - 1)),
      to: new Date(today.setDate(today.getDate() - 1)),
    },
    last7Days: {
      label: "Последняя неделя",
      from: new Date(today.setDate(today.getDate() - 6)),
      to: today,
    },
    last30Days: {
      label: "Последний месяц",
      from: new Date(today.setDate(today.getDate() - 29)),
      to: today,
    },
  };

  const calendarToggle = document.getElementById("calendar-toggle");
  const dateRangeInput = document.getElementById("date-range");
  const exportButton = document.getElementById("export-button");
  const errorMessage = document.getElementById("error-message");
  const loading = document.getElementById("loading");
  const flexContainer = document.querySelector(".flex-container");

  let token = null; // Initialize token as null
  let productsData = [];
  let ingredientsData = [];
  let storesData = [];

  // Create Authenticate button
  const authButton = document.createElement("button");
  authButton.textContent = "Авторизоваться";
  authButton.className = "auth-button";
  authButton.style.display = "none"; // Hidden by default
  authButton.addEventListener("click", () => {
    window.location.href =
      "https://joinposter.com/api/auth?application_id=4164&redirect_uri=https://expressposterstorage.onrender.com/api/auth&response_type=code";
  });

  // Append auth button to flex-container
  flexContainer.appendChild(authButton);

  // Function to toggle UI based on token availability
  function toggleUI(hasToken) {
    if (hasToken) {
      calendarToggle.style.display = "inline-block";
      exportButton.style.display = "inline-block";
      authButton.style.display = "none";
    } else {
      calendarToggle.style.display = "none";
      exportButton.style.display = "none";
      authButton.style.display = "inline-block";
      errorMessage.textContent = "Пожалуйста, авторизуйтесь для продолжения";
    }
  }

  // Flatpickr sozlash
  const fp = flatpickr(dateRangeInput, {
    mode: "range",
    dateFormat: "Y-m-d",
    locale: "ru",
    onChange: (selectedDates) => {
      if (selectedDates.length === 2) {
        calendarToggle.textContent = `📅 ${formatDate(
          selectedDates[0]
        )} - ${formatDate(selectedDates[1])}`;
      }
    },
  });

  // Sana formatlash
  function formatDate(date) {
    const months = [
      "январь",
      "февраль",
      "март",
      "апрель",
      "май",
      "июнь",
      "июль",
      "август",
      "сентябрь",
      "октябрь",
      "ноябрь",
      "декабрь",
    ];
    return `${date.getDate().toString().padStart(2, "0")}.${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${date.getFullYear()}`;
  }

  // Yordamchi funksiyalar (utils/functions.js dan ko'chirildi)
  function formatCustomDate(dateString) {
    const monthsRu = [
      "январь",
      "февраль",
      "март",
      "апрель",
      "май",
      "июнь",
      "июль",
      "август",
      "сентябрь",
      "октябрь",
      "ноябрь",
      "декабрь",
    ];
    const date = new Date(dateString);
    const year = date.getFullYear();
    const day = String(date.getDate()).padStart(2, "0");
    const month = monthsRu[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${hours}:${minutes}`;
  }

  function formatSupplySum(sum) {
    if (typeof sum !== "number") return "Noto‘g‘ri qiymat";
    const divided = sum / 100;
    return divided.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Kalendar ochish/yopish
  calendarToggle.addEventListener("click", () => {
    fp.toggle();
  });

  // Quick ranges tugmalari
  const quickRangesContainer = document.createElement("div");
  quickRangesContainer.className = "quick-ranges";
  Object.entries(quickRanges).forEach(([key, { label, from, to }]) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.className = "quick-range-button";
    button.addEventListener("click", () => {
      fp.setDate([from, to]);
      calendarToggle.textContent = `📅 ${formatDate(from)} - ${formatDate(to)}`;
    });
    quickRangesContainer.appendChild(button);
  });
  calendarToggle.parentElement.appendChild(quickRangesContainer);

  // Token olish
  axios
    .get("/getToken")
    .then((response) => {
      if (response.data.token) {
        token = response.data.token;
        toggleUI(true);
        fetchInitialData();
      } else {
        toggleUI(false);
      }
    })
    .catch((err) => {
      console.error("Token fetch error:", err);
      toggleUI(false);
    });

  // Boshlang'ich ma'lumotlarni olish
  async function fetchInitialData() {
    try {
      const [products, ingredients, stores] = await Promise.all([
        axios.get("/api/poster/fetch-poster-api", {
          params: { token, endpoint: "menu.getProducts" },
        }),
        axios.get("/api/poster/fetch-poster-api", {
          params: { token, endpoint: "menu.getIngredients" },
        }),
        axios.get("/api/poster/fetch-poster-api", {
          params: { token, endpoint: "storage.getStorages" },
        }),
      ]);
      productsData = products.data.response || [];
      ingredientsData = ingredients.data.response || [];
      storesData = stores.data.response || [];
    } catch (err) {
      errorMessage.textContent = `Ошибка при получении данных: ${err.message}`;
      console.error("Initial data fetch error:", err);
    }
  }

  // Eksport qilish
  exportButton.addEventListener("click", async () => {
    if (!token) {
      toggleUI(false);
      return;
    }

    const dates = fp.selectedDates;
    if (dates.length !== 2) {
      errorMessage.textContent = "Пожалуйста, выберите дату";
      return;
    }

    const fromDate = dates[0].toISOString().split("T")[0];
    const toDate = dates[1].toISOString().split("T")[0];
    const dayDiff = (dates[1] - dates[0]) / (1000 * 60 * 60 * 24);

    if (dayDiff > 31) {
      errorMessage.textContent = "Максимальный интервал — 1 месяц";
      return;
    }

    errorMessage.textContent = "";
    loading.style.display = "flex";
    exportButton.disabled = true;

    try {
      // Fetch export data
      const response = await axios
        .get("/api/poster/fetch-export-data", {
          params: { token, dateFrom: fromDate, dateTo: toDate },
        })
        .catch((err) => {
          throw new Error(`Failed to fetch export data: ${err.message}`);
        });

      let {
        suppliesData = [],
        movesData = [],
        wastesData = [],
      } = response.data;

      // Supplies ma'lumotlarini qayta ishlash
      suppliesData = await Promise.all(
        suppliesData.map(async (item) => {
          try {
            const dataFetch = await axios
              .get("/api/poster/fetch-poster-api", {
                params: {
                  token,
                  endpoint: "storage.getSupply",
                  supply_id: item.supply_id,
                },
              })
              .catch((err) => {
                throw new Error(
                  `Failed to fetch supply data for supply_id ${item.supply_id}: ${err.message}`
                );
              });

            const fullSupply = {
              ...dataFetch.data.response,
              storage_name: item.storage_name,
            };
            const ingredients = fullSupply.ingredients || [];

            return ingredients.map((element) => {
              let findRest;
              const findStore =
                storesData.find(
                  (store) => store.storage_id == fullSupply.storage_id
                ) || {};
              if (element?.type == "10") {
                findRest =
                  ingredientsData.find(
                    (ingredient) =>
                      ingredient.ingredient_id == element.ingredient_id
                  ) || {};
                return {
                  ...fullSupply,
                  ...element,
                  ...findRest,
                  ingredient_unit:
                    element?.ingredient_unit == "kg"
                      ? "кг"
                      : element?.ingredient_unit == "p"
                      ? "шт"
                      : "л",
                  storage_name: findStore.storage_name || "Unknown",
                };
              } else {
                findRest =
                  productsData.find(
                    (product) => product.product_id == element.product_id
                  ) || {};
                const findIngredient =
                  ingredientsData.find(
                    (ing) => ing.ingredient_id == element?.ingredient_id
                  ) || {};
                return {
                  ...element,
                  ...findRest,
                  ...fullSupply,
                  ...findIngredient,
                  ingredient_unit:
                    element?.ingredient_unit == "kg"
                      ? "кг"
                      : element?.ingredient_unit == "p"
                      ? "шт"
                      : "л",
                  storage_name: findStore.storage_name || "Unknown",
                };
              }
            });
          } catch (err) {
            console.error(
              `Error processing supply item ${item.supply_id}:`,
              err.message
            );
            return [];
          }
        })
      ).then((results) => results.flat());

      // Moves ma'lumotlarini qayta ishlash
      movesData = await Promise.all(
        movesData.map(async (item) => {
          try {
            const dataFetch = await axios
              .get("/api/poster/fetch-poster-api", {
                params: {
                  token,
                  endpoint: "storage.getMove",
                  move_id: item.moving_id,
                },
              })
              .catch((err) => {
                throw new Error(
                  `Failed to fetch move data for move_id ${item.moving_id}: ${err.message}`
                );
              });

            const fullMoves = Array.isArray(dataFetch.data.response)
              ? dataFetch.data.response[0] || {}
              : dataFetch.data.response || {};
            const ingredients = fullMoves.ingredients || [];

            return ingredients.map((element) => {
              let findRest;
              const findStore =
                storesData.find(
                  (store) => store.storage_id == fullMoves.storage_id
                ) || {};
              if (element?.type == "10") {
                findRest =
                  ingredientsData.find(
                    (ingredient) =>
                      ingredient.ingredient_id == element.ingredient_id
                  ) || {};
                return {
                  ...fullMoves,
                  ...element,
                  ...findRest,
                  ingredient_unit:
                    findRest?.ingredient_unit == "kg"
                      ? "кг"
                      : findRest?.ingredient_unit == "p"
                      ? "шт"
                      : "л",
                  storage_name: findStore.storage_name || "Unknown",
                };
              } else {
                findRest =
                  productsData.find(
                    (product) => product.product_id == element.product_id
                  ) || {};
                const findIngredient =
                  ingredientsData.find(
                    (ing) => ing.ingredient_id == element?.ingredient_id
                  ) || {};
                return {
                  ...element,
                  ...findRest,
                  ...fullMoves,
                  ...findIngredient,
                  ingredient_unit:
                    findIngredient?.unit == "kg"
                      ? "кг"
                      : findIngredient?.unit == "p"
                      ? "шт"
                      : "л",
                  storage_name: findStore.storage_name || "Unknown",
                };
              }
            });
          } catch (err) {
            console.error(
              `Error processing move item ${item.moving_id}:`,
              err.message
            );
            return [];
          }
        })
      ).then((results) => results.flat());

      // Wastes ma'lumotlarini qayta ishlash
      wastesData = await Promise.all(
        wastesData.map(async (item) => {
          try {
            const dataFetch = await axios
              .get("/api/poster/fetch-poster-api", {
                params: {
                  token,
                  endpoint: "storage.getWaste",
                  waste_id: item.waste_id,
                },
              })
              .catch((err) => {
                throw new Error(
                  `Failed to fetch waste data for waste_id ${item.waste_id}: ${err.message}`
                );
              });

            const fullWastes = dataFetch.data.response || {};
            const elements = fullWastes.elements || [];

            return elements.map((element) => {
              let findRest;
              const findStore =
                storesData.find(
                  (store) => store.storage_id == fullWastes.storage_id
                ) || {};
              if (element?.type == "10") {
                findRest =
                  ingredientsData.find(
                    (ingredient) =>
                      ingredient.ingredient_id == element.ingredient_id
                  ) || {};
                return {
                  ...fullWastes,
                  ...element,
                  ...findRest,
                  ingredient_unit:
                    findRest?.ingredient_unit == "kg"
                      ? "кг"
                      : findRest?.ingredient_unit == "p"
                      ? "шт"
                      : "л",
                  storage_name: findStore.storage_name || "Unknown",
                };
              } else {
                findRest =
                  productsData.find(
                    (product) => product.product_id == element.product_id
                  ) || {};
                const findIngredient =
                  ingredientsData.find(
                    (ing) =>
                      ing.ingredient_id ==
                      (element.ingredients &&
                        element.ingredients[0]?.ingredient_id)
                  ) || {};
                return {
                  ...element,
                  ...findRest,
                  ...fullWastes,
                  ...findIngredient,
                  ingredient_unit:
                    findIngredient?.unit == "kg"
                      ? "кг"
                      : findIngredient?.unit == "p"
                      ? "шт"
                      : "л",
                  storage_name: findStore.storage_name || "Unknown",
                };
              }
            });
          } catch (err) {
            console.error(
              `Error processing waste item ${item.waste_id}:`,
              err.message
            );
            return [];
          }
        })
      ).then((results) => results.flat());

      // Excel faylini yaratish
      const exportChunks = [
        {
          name: "Поставки",
          headers: [
            "№",
            "Дата",
            "Поставщик",
            "Товар",
            "Кол-во",
            "Ед. изм.",
            "Сумма без НДС",
            "Склад",
            "Счёт",
            "Сотрудник",
          ],
          data: suppliesData.map((item) => [
            item.supply_id || "",
            formatCustomDate(String(item.date || new Date())),
            item.supplier_name || "Unknown",
            item?.ingredient_name || "Unknown",
            item?.supply_ingredient_num || 0,
            item?.ingredient_unit || "Unknown",
            formatSupplySum(Number(item?.supply_ingredient_sum_netto || 0)) +
              " СУМ",
            item.storage_name || "Unknown",
            item.account_id || "",
            "",
          ]),
        },
        {
          name: "Перемещения",
          headers: [
            "Дата",
            "Наименование",
            "Кол-во",
            "Ед. изм.",
            "Сумма без НДС",
            "Комментарий",
            "Склад отгрузки",
            "Склад приемки",
            "Сотрудник",
          ],
          data: movesData.map((item) => [
            formatCustomDate(String(item.date || new Date())),
            item?.type == 10
              ? item?.ingredient_name || "Unknown"
              : item?.product_name || "Unknown",
            item?.ingredient_num || 0,
            item?.ingredient_unit || "Unknown",
            formatSupplySum(Number(item?.ingredient_sum_netto || 0)) + " СУМ",
            "",
            item.to_storage_name || "Unknown",
            item.from_storage_name || "Unknown",
            item.user_name || "Unknown",
          ]),
        },
        {
          name: "Списания",
          headers: [
            "Дата",
            "Склад",
            "Что списывается",
            "Кол-во",
            "Ед-ца измерения",
            "Сумма без НДС",
            "Причина",
          ],
          data: wastesData.map((item) => [
            formatCustomDate(String(item.date || new Date())),
            item.storage_name || "Unknown",
            item?.type == 10
              ? item?.ingredient_name || "Unknown"
              : item?.product_name || "Unknown",
            item?.type == 10 ? item?.ingredient_left || 0 : item?.count || 0,
            item?.ingredient_unit || "Unknown",
            item?.type == 10
              ? formatSupplySum(Number(item?.total_sum_netto || 0)) + " СУМ"
              : formatSupplySum(Number(item?.cost_netto || 0)) + " СУМ",
            item.reason_name || "Unknown",
          ]),
        },
      ];

      const wb = XLSX.utils.book_new();
      const MAX_ROWS = 10000;

      let hasCombined = false;
      for (const { name, headers, data } of exportChunks) {
        if (data.length <= MAX_ROWS) {
          const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
          XLSX.utils.book_append_sheet(wb, sheet, name);
          hasCombined = true;
        }
      }

      if (hasCombined) {
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fromDate}-${toDate}-Combined.xlsx`;
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        errorMessage.textContent = "Файлы успешно скачаны!";
      } else {
        errorMessage.textContent = "Нет данных для экспорта";
      }
    } catch (err) {
      errorMessage.textContent = `Ошибка при экспорте данных: ${err.message}`;
      console.error("Export error:", err);
    } finally {
      loading.style.display = "none";
      exportButton.disabled = false;
    }
  });

  // Spinnerni yashirish
  window.addEventListener("load", () => {
    if (window.top && window.top !== window) {
      window.top.postMessage({ hideSpinner: true }, "*");
    }
  });
});